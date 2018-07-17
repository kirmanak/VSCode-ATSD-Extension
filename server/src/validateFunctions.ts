import * as Levenshtein from "levenshtein";
import { Diagnostic, DiagnosticSeverity, Location, Range, TextDocument } from "vscode-languageserver";
import * as Shared from "./sharedFunctions";

function suggestionMessage(word: string, dictionaries: Map<string, string[]>): string {
    let suggestion = null;
    let min = Number.MAX_VALUE;
    dictionaries.forEach((dictionary) => {
        dictionary.forEach((value) => {
            if (value === undefined) { return; }
            const distance = new Levenshtein(value, word).distance;
            if (distance < min) {
                min = distance;
                suggestion = value;
            }
        });
    });
    return Shared.errorMessage(word, suggestion);
}

function spellingCheck(line: string, uri: string, i: number): Diagnostic | null {
    let match: RegExpExecArray;

    /* statements like `[section] variable = value` aren't supported */
    match = /^([ \t]*\[)(\w+)\]/gm.exec(line);
    if (!match) { match = /^(['" \t]*)([-\w]+)['" \t]*=/gm.exec(line); }
    if (match) {
        const indent = match[1].length;
        const word = match[2].toLowerCase();
        const withoutDashes = word.replace(/-/g, "");
        const map = new Map<string, string[]>();
        if (match[0].endsWith("]")) {
            map.set("dictionary", possibleSections);
        } else {
            if (withoutDashes.startsWith("column")) { return null; }
            map.set("dictionary", possibleOptions);
        }
        if (!isVarDeclared(withoutDashes, map)) {
            const message = suggestionMessage(word, map);
            const location: Location = {
                range: {
                    end: { line: i, character: indent + word.length },
                    start: { line: i, character: indent }
                }, uri
            };
            return Shared.createDiagnostic(location, DiagnosticSeverity.Error, message);
        }
    }

    return null;
}

class FoundKeyword {
    public static createRegex(): RegExp {
        return /^([ \t]*)(endvar|endcsv|endfor|elseif|endif|endscript|endlist|script|else|if|list|for|csv|var)\b/gm;
    }

    public static parseControlSequence(regex: RegExp, line: string, i: number): FoundKeyword | null {
        const match = regex.exec(line);
        if (match === null) { return null; }
        const keywordStart = match[1].length;
        return {
            keyword: match[2],
            range: {
                end: { line: i, character: keywordStart + match[2].length },
                start: { line: i, character: keywordStart }
            }
        };
    }

    public keyword: string;
    public range: Range;

}

function countCsvColumns(line: string): number {
    const regex = /(['"]).+?\1|[()-\w.]+/g;
    let counter = 0;
    while (regex.exec(line)) { counter++; }
    return counter;
}

function checkEnd(expectedEnd: string, nestedStack: FoundKeyword[],
                  foundKeyword: FoundKeyword, uri: string): Diagnostic | null {
    const stackHead = nestedStack.pop();
    if (stackHead !== undefined && stackHead.keyword === expectedEnd) { return null; }
    if (stackHead !== undefined) { nestedStack.push(stackHead); } // push found keyword back
    const unfinishedIndex = nestedStack.findIndex((value) =>
        (value === undefined) ? false : value.keyword === expectedEnd
    );
    if (stackHead === undefined || unfinishedIndex === -1) {
        return Shared.createDiagnostic(
            { uri, range: foundKeyword.range }, DiagnosticSeverity.Error,
            `${foundKeyword.keyword} has no matching ${expectedEnd}`
        );
    } else {
        delete nestedStack[unfinishedIndex];
        return Shared.createDiagnostic(
            { uri, range: foundKeyword.range }, DiagnosticSeverity.Error,
            `${expectedEnd} has finished before ${stackHead.keyword}`
        );
    }
}

function isVarDeclared(variable: string, dictionaries: Map<string, string[]>): boolean {
    let result = false;
    dictionaries.forEach((dictionary) => {
        dictionary.forEach((value) => {
            if (variable === value) { result = true; }
        });
    });
    return result;
}

function addToArray(map: Map<string, string[]>, key: string, severity: DiagnosticSeverity,
                    match: RegExpExecArray, uri: string, i: number): Diagnostic | null {
    let diagnostic: Diagnostic = null;
    const variable = match[2];
    if (isVarDeclared(variable, map)) {
        const startPosition = match.index + match[1].length;
        diagnostic = Shared.createDiagnostic(
            {
                range: {
                    end: { line: i, character: startPosition + variable.length },
                    start: { line: i, character: startPosition }
                }, uri
            },
            severity, `${variable} is already defined`
        );
    } else {
        const array = map.get(key);
        array.push(variable);
        map.set(key, array);
    }
    return diagnostic;
}

function checkPreviousSection(previousSection: FoundKeyword, settings: Map<string, string[]>, uri: string): Diagnostic[] {
    const result: Diagnostic[] = [];
    const requiredSettings = requiredSectionSettingsMap.get(previousSection.keyword);
    if (requiredSettings) {
        requiredSettings.forEach((options) => {
            const foundOption = options.find((option) => isVarDeclared(option, settings));
            if (!foundOption) {
                result.push(Shared.createDiagnostic(
                    { range: previousSection.range, uri },
                    DiagnosticSeverity.Error, `${options[0]} is required`
                ));
            }
        });
    }

    return result;
}

export function lineByLine(textDocument: TextDocument): Diagnostic[] {
    const result: Diagnostic[] = [];
    const lines: string[] = Shared.deleteComments(textDocument.getText()).split("\n");
    const nestedStack: FoundKeyword[] = [];
    let isUserDefined = false; // to disable spelling check
    let isScript = false; // to disable everything
    let isCsv = false; // to perform validation
    let isFor = false;
    let isIf = false;
    let csvColumns = 0; // to validate csv
    let previousSection: FoundKeyword = null; // to validate required settings
    const variables = new Map<string, string[]>(); // to validate variables
    const settings = new Map<string, string[]>(); // to validate variables
    const aliases = new Map<string, string[]>(); // to validate `value = value('alias')`
    aliases.set("aliases", []);
    settings.set("settings", []);
    variables.set("listNames", []);
    variables.set("varNames", []);
    variables.set("csvNames", []);
    variables.set("forVariables", []);
    const deAliases: FoundKeyword[] = [];
    let match: RegExpExecArray;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^[ \t]*$/m.test(line) && isUserDefined) { isUserDefined = false; }

        // handle tags
        match = /(^[\t ]*)\[(\w+)\][\t ]*/m.exec(line);
        if (match) {
            if (/tags?|keys/.test(match[2])) {
                isUserDefined = true;
            } else {
                if (previousSection) {
                    checkPreviousSection(previousSection, settings, textDocument.uri).forEach((diagnostic) => {
                        result.push(diagnostic);
                    });
                }
                isUserDefined = false;
                settings.set("settings", []);
            }
            previousSection = {
                range: {
                    end: { line: i, character: match[1].length + match[2].length },
                    start: { line: i, character: match[1].length }
                },
                keyword: match[2]
            };
        }

        // validate aliases, spellings, repetition of settings
        if (!isUserDefined && !isScript) {
            // aliases
            match = /(^\s*alias\s*=\s*)(\w+)\s*$/m.exec(line);
            const deAliasRegex = /(^\s*value\s*=.*value\((['"]))(\w+)\2\).*$/m;
            if (match) {
                const diagnostic = addToArray(aliases, "aliases", DiagnosticSeverity.Error, match, textDocument.uri, i);
                if (diagnostic) { result.push(diagnostic); }
            } else if (deAliasRegex.test(line)) {
                match = deAliasRegex.exec(line);
                deAliases.push({
                    keyword: match[3], range: {
                        end: { line: i, character: match[1].length + match[3].length },
                        start: { line: i, character: match[1].length }
                    }
                });
            }

            // spelling
            const misspelling = spellingCheck(line, textDocument.uri, i);
            if (misspelling) { result.push(misspelling); }

            // repetition
            match = /(^\s*)([-\w]+)\s*=/.exec(line);
            if (match) {
                const target: string = (isIf) ? "if" : "settings";
                const diagnostic = addToArray(settings, target, DiagnosticSeverity.Warning, match, textDocument.uri, i);
                if (diagnostic) { result.push(diagnostic); }
            }
        } else if (!isScript && /(^[ \t]*)([-\w]+)[ \t]*=/.test(line)) {
            match = /(^[ \t]*)([-\w]+)[ \t]*=/.exec(line);
            const setting = match[2].toLowerCase().replace(/-/g, "");
            console.log(setting);
            const map = new Map<string, string[]>();
            map.set("possibleOptions", possibleOptions);
            if (isVarDeclared(setting, map)) {
                result.push(Shared.createDiagnostic(
                    {
                        range: {
                            end: { line: i, character: match[1].length + match[2].length },
                            start: { line: i, character: match[1].length }
                        },
                        uri: textDocument.uri
                    },
                    DiagnosticSeverity.Information, `${setting} is interpreted as a tag`
                ));
            }
        }

        // validate for variables
        if (isFor) {
            const atRegexp = /@{.+?}/g;
            match = atRegexp.exec(line);
            while (match) {
                const substr = match[0];
                const startPosition = match.index;
                const varRegexp = /[a-zA-Z_]\w*(?!\w*["\('])/g;
                match = varRegexp.exec(substr);
                while (match) {
                    if (substr.charAt(match.index - 1) === ".") {
                        match = varRegexp.exec(substr);
                        continue;
                    }
                    const variable = match[0];
                    if (!isVarDeclared(variable, variables)) {
                        const position = startPosition + match.index;
                        const message = suggestionMessage(variable, variables);
                        result.push(Shared.createDiagnostic(
                            {
                                range: {
                                    end: { line: i, character: position + variable.length },
                                    start: { line: i, character: position }
                                }, uri: textDocument.uri
                            },
                            DiagnosticSeverity.Error, message
                        ));
                    }
                    match = varRegexp.exec(substr);
                }
                match = atRegexp.exec(line);
            }
        }
        // prepare regex to let 'g' key do its work
        const regex = FoundKeyword.createRegex();
        let foundKeyword = FoundKeyword.parseControlSequence(regex, line, i);

        // validate CSV
        if (isCsv && (foundKeyword === null || foundKeyword.keyword !== "endcsv")) {
            const columns = countCsvColumns(line);
            if (columns !== csvColumns && !/^[ \t]*$/m.test(line)) {
                result.push(Shared.createDiagnostic(
                    {
                        range: {
                            end: { line: i, character: line.length },
                            start: { line: i, character: 0 }
                        }, uri: textDocument.uri
                    },
                    DiagnosticSeverity.Error, `Expected ${csvColumns} columns, but found ${columns}`
                ));
            }
            continue;
        }

        while (foundKeyword !== null) { // `while` can handle several keywords per line

            // handle scripts
            if (foundKeyword.keyword === "endscript") {
                const stackHead = nestedStack.pop();
                if (stackHead === undefined || stackHead.keyword !== "script") {
                    if (stackHead !== undefined) { nestedStack.push(stackHead); }
                    result.push(Shared.createDiagnostic(
                        { uri: textDocument.uri, range: foundKeyword.range }, DiagnosticSeverity.Error,
                        `${foundKeyword.keyword} has no matching script`
                    ));
                }
                isScript = false;
                foundKeyword = FoundKeyword.parseControlSequence(regex, line, i);
                if (foundKeyword === null) { break; }
            } else if (isScript) { break; }

            switch (foundKeyword.keyword) {
                case "endcsv": {
                    isCsv = false;
                    const diagnostic = checkEnd("csv", nestedStack, foundKeyword, textDocument.uri);
                    if (diagnostic !== null) { result.push(diagnostic); }
                    break;
                }
                case "endif": {
                    settings.set("if", []);
                    const diagnostic = checkEnd("if", nestedStack, foundKeyword, textDocument.uri);
                    isIf = false;
                    if (diagnostic !== null) { result.push(diagnostic); }
                    break;
                }
                case "endfor": {
                    isFor = false;
                    const forVariables = variables.get("forVariables");
                    forVariables.pop();
                    variables.set("forVariables", forVariables);
                    const diagnostic = checkEnd("for", nestedStack, foundKeyword, textDocument.uri);
                    if (diagnostic !== null) { result.push(diagnostic); }
                    break;
                }
                case "endlist": {
                    const diagnostic = checkEnd("list", nestedStack, foundKeyword, textDocument.uri);
                    if (diagnostic !== null) { result.push(diagnostic); }
                    break;
                }
                case "endvar": {
                    const diagnostic = checkEnd("var", nestedStack, foundKeyword, textDocument.uri);
                    if (diagnostic !== null) { result.push(diagnostic); }
                    break;
                }
                case "else":
                case "elseif": {
                    settings.set("if", []);
                    const stackHead = nestedStack.pop();
                    const ifKeyword = nestedStack.find((value) =>
                        (value === undefined) ? false : value.keyword === "if"
                    );
                    if (stackHead === undefined ||
                        (stackHead.keyword !== "if" && ifKeyword === undefined)) {
                        result.push(Shared.createDiagnostic(
                            { uri: textDocument.uri, range: foundKeyword.range }, DiagnosticSeverity.Error,
                            `${foundKeyword.keyword} has no matching if`
                        ));
                    } else if (stackHead.keyword !== "if") {
                        result.push(Shared.createDiagnostic(
                            { uri: textDocument.uri, range: foundKeyword.range }, DiagnosticSeverity.Error,
                            `${foundKeyword.keyword} has started before ${stackHead} has finished`
                        ));
                    }
                    nestedStack.push(stackHead);
                    break;
                }
                case "csv": {
                    isCsv = true;
                    let header: string;
                    if (/=[ \t]*$/m.test(line)) {
                        let j = i + 1;
                        header = lines[j];
                        while (header && /^[ \t]*$/m.test(header)) {
                            header = lines[++j];
                        }
                    } else { header = line.substring(/=/.exec(line).index + 1); }
                    match = /(csv[ \t]+)(\w+)[ \t]*=/.exec(line);
                    if (match) {
                        const diagnostic = addToArray(variables, "csvNames", DiagnosticSeverity.Error, match, textDocument.uri, i);
                        if (diagnostic) { result.push(diagnostic); }
                    }
                    csvColumns = countCsvColumns(header);
                    nestedStack.push(foundKeyword);
                    break;
                }
                case "var": {
                    if (/=\s*(\[|\{)(|.*,)\s*$/m.test(line)) { nestedStack.push(foundKeyword); }
                    match = /(var\s*)(\w+)\s*=/.exec(line);
                    if (match) {
                        const diagnostic = addToArray(variables, "varNames", DiagnosticSeverity.Error, match, textDocument.uri, i);
                        if (diagnostic) { result.push(diagnostic); }
                    }
                    break;
                }
                case "list": {
                    match = /(^\s*list\s+)(\w+)\s+=/.exec(line);
                    if (match) {
                        const diagnostic = addToArray(variables, "listNames", DiagnosticSeverity.Error, match, textDocument.uri, i);
                        if (diagnostic) { result.push(diagnostic); }
                    }
                    if (/(=|,)[ \t]*$/m.test(line)) {
                        nestedStack.push(foundKeyword);
                    } else {
                        let j = i + 1;
                        while ((j < lines.length) && /^[ \t]*$/m.test(lines[j])) {
                            j++;
                        }
                        if (j !== lines.length && (/^[ \t]*,/.test(lines[j]) || /\bendlist\b/.test(lines[j]))) {
                            nestedStack.push(foundKeyword);
                        }
                    }
                    break;
                }
                case "for": {
                    isFor = true;
                    nestedStack.push(foundKeyword);
                    match = /(^\s*for\s+)(\w+)\s+in/m.exec(line);
                    if (match) {
                        const matching = match;
                        match = /^(\s*for\s+\w+\s+in\s+)(\w+)\s*$/m.exec(line);
                        if (match) {
                            const variable = match[2];
                            if (!isVarDeclared(variable, variables)) {
                                const message = suggestionMessage(variable, variables);
                                result.push(Shared.createDiagnostic(
                                    {
                                        range: {
                                            end: { line: i, character: match[1].length + variable.length },
                                            start: { line: i, character: match[1].length }
                                        }, uri: textDocument.uri
                                    },
                                    DiagnosticSeverity.Error, message
                                ));
                            }
                        } else {
                            result.push(Shared.createDiagnostic(
                                {
                                    range: {
                                        end: { line: i, character: matching[0].length + 2 },
                                        start: { line: i, character: matching[0].length + 1 }
                                    }, uri: textDocument.uri
                                },
                                DiagnosticSeverity.Error, "Empty 'in' statement"
                            ));
                        }
                        const diagnostic = addToArray(variables, "forVariables", DiagnosticSeverity.Error, matching, textDocument.uri, i);
                        if (diagnostic) { result.push(diagnostic); }
                    }
                    break;
                }
                case "if": {
                    nestedStack.push(foundKeyword);
                    isIf = true;
                    settings.set("if", []);
                    break;
                }
                case "script": {
                    if (/^[ \t]*script[ \t]*=[ \t]*\S+.*$/m.test(line)) {
                        let j = i + 1;
                        while (j < lines.length && !(/\bscript\b/.test(lines[j]) || /\bendscript\b/.test(lines[j]))) {
                            j++;
                        }
                        if (j === lines.length || /\bscript\b/.test(lines[j])) { break; }
                    }
                    nestedStack.push(foundKeyword);
                    isScript = true;
                    break;
                }
                default: throw new Error("Update switch-case statement!");
            }

            foundKeyword = FoundKeyword.parseControlSequence(regex, line, i);
        }
    }

    deAliases.forEach((deAlias) => {
        if (!isVarDeclared(deAlias.keyword, aliases)) {
            const message = suggestionMessage(deAlias.keyword, aliases);
            result.push(Shared.createDiagnostic(
                { uri: textDocument.uri, range: deAlias.range },
                DiagnosticSeverity.Error, message
            ));
        }
    });

    diagnosticForLeftKeywords(nestedStack, textDocument.uri).forEach((diagnostic) => {
        result.push(diagnostic);
    });

    if (previousSection) {
        checkPreviousSection(previousSection, settings, textDocument.uri).forEach((diagnostic) => {
            result.push(diagnostic);
        });
    }

    return result;
}

function diagnosticForLeftKeywords(nestedStack: FoundKeyword[], uri: string): Diagnostic[] {
    const result: Diagnostic[] = [];
    for (let i = 0, length = nestedStack.length; i < length; i++) {
        const nestedConstruction = nestedStack[i];
        if (nestedConstruction === null || nestedConstruction === undefined) { continue; }
        switch (nestedConstruction.keyword) {
            case "for": {
                result.push(Shared.createDiagnostic(
                    { uri, range: nestedConstruction.range }, DiagnosticSeverity.Error,
                    `${nestedConstruction.keyword} has no matching endfor`
                ));
                break;
            }
            case "if": {
                result.push(Shared.createDiagnostic(
                    { uri, range: nestedConstruction.range }, DiagnosticSeverity.Error,
                    `${nestedConstruction.keyword} has no matching endif`
                ));
                break;
            }
            case "script": {
                result.push(Shared.createDiagnostic(
                    { uri, range: nestedConstruction.range }, DiagnosticSeverity.Error,
                    `${nestedConstruction.keyword} has no matching endscript`
                ));
                break;
            }
            case "list": {
                result.push(Shared.createDiagnostic(
                    { uri, range: nestedConstruction.range }, DiagnosticSeverity.Error,
                    `${nestedConstruction.keyword} has no matching endlist`
                ));
                break;
            }
            case "csv": {
                result.push(Shared.createDiagnostic(
                    { uri, range: nestedConstruction.range }, DiagnosticSeverity.Error,
                    `${nestedConstruction.keyword} has no matching endcsv`
                ));
                break;
            }
            case "var": {
                result.push(Shared.createDiagnostic(
                    { uri, range: nestedConstruction.range }, DiagnosticSeverity.Error,
                    `${nestedConstruction.keyword} has no matching endvar`
                ));
                break;
            }
        }
    }

    return result;
}

const requiredSectionSettingsMap = new Map<string, string[][]>();
requiredSectionSettingsMap.set("series", [["entity"], ["metric", "table", "attribute"]]);
requiredSectionSettingsMap.set("widget", [["type"]]);

const possibleOptions = [
    "actionenable", "add", "addmeta", "aheadtimespan", "alert",
    "alertexpression", "alertrowstyle", "alertstyle", "alias", "align", "arcs",
    "arrowlength", "arrows", "attribute", "audio", "audioalert",
    "audioonload", "autoheight", "autopadding", "autoperiod", "autoscale",
    "axis", "axislabel", "axistitle", "axistitleright", "bar", "barcount",
    "batchsize", "batchupdate", "borderwidth", "bottomaxis", "bundle",
    "bundled", "buttons", "cache", "capitalize", "caption", "captionstyle",
    "case", "centralizecolumns", "centralizeticks", "changefield", "chartmode",
    "circle", "class", "collapsible", "color", "colorrange", "colors",
    "columnlabelformat", "columns", "connect", "connectvalues", "context",
    "contextheight", "contextpath", "counter", "counterposition", "current",
    "currentperiodstyle", "data", "datatype", "dayformat", "default",
    "defaultcolor", "defaultsize", "depth", "dialogmaximize", "disablealert",
    "disconnect", "disconnectcount", "disconnectednodedisplay",
    "disconnectinterval", "disconnectvalue", "display", "displaydate",
    "displayinlegend", "displaylabels", "displayother", "displaypanels",
    "displaytags", "displayticks", "displaytip", "displaytotal",
    "displayvalues", "dummy", "duration", "effects", "empty",
    "emptyrefreshinterval", "emptythreshold", "enabled", "end", "endtime",
    "endworkingminutes", "entities", "entitiesbatchupdate", "entity",
    "entityexpression", "entitygroup", "entitylabel", "error",
    "errorrefreshinterval", "exact", "exactmatch", "expand", "expandpanels",
    "expandtags", "expiretimespan", "fasten", "fillvalue", "filter",
    "filterrange", "fitsvg", "fontscale", "fontsize", "forecast",
    "forecastname", "forecaststyle", "format", "formataxis", "formatcounter",
    "formatheaders", "formatnumbers", "formatsize", "formattip", "frequency",
    "gradientcount", "gradientintensity", "group", "groupfirst",
    "groupinterpolate", "groupinterpolateextend", "groupkeys", "grouplabel",
    "groupperiod", "groups", "groupstatistic", "header", "headerstyle",
    "heightunits", "hidden", "hide", "hidecolumn", "hideemptycolumns",
    "hideemptyseries", "hideifempty", "horizontal", "horizontalgrid",
    "hourformat", "icon", "iconalertexpression", "iconalertstyle", "iconcolor",
    "iconposition", "iconsize", "id", "init", "interpolate",
    "interpolateboundary", "interpolateextend", "interpolatefill",
    "interpolatefunction", "interpolateperiod", "intervalformat", "is", "join",
    "key", "keys", "keytagexpression", "label", "labelformat", "last",
    "lastmarker", "lastvaluelabel", "layout", "leftaxis", "leftunits",
    "legendlastvalue", "legendposition", "legendticks", "legendvalue", "limit",
    "linearzoom", "link", "linkalertexpression", "linkalertsstyle",
    "linkalertstyle", "linkanimate", "linkcolorrange", "linkcolors",
    "linkdata", "linklabels", "linklabelzoomthreshold", "links",
    "linkthresholds", "linkvalue", "linkwidthorder", "linkwidths", "load",
    "loadfuturedata", "marker", "markerformat", "markers", "max",
    "maxfontsize", "maximum", "maxrange", "maxrangeforce", "maxrangeright",
    "maxrangerightforce", "maxringwidth", "maxthreshold", "menu",
    "mergecolumns", "mergecolumnsbatchupdate", "mergefields", "methodpath",
    "metric", "metriclabel", "min", "mincaptionsize", "minfontsize", "minimum",
    "minorticks", "minrange", "minrangeforce", "minrangeright",
    "minrangerightforce", "minringwidth", "minseverity", "minthreshold",
    "mode", "moving", "movingaverage", "multiple", "multiplecolumn",
    "multipleseries", "negative", "negativestyle", "node",
    "nodealertexpression", "nodealertstyle", "nodecollapse", "nodecolors",
    "nodeconnect", "nodedata", "nodelabels", "nodelabelzoomthreshold",
    "noderadius", "noderadiuses", "nodes", "nodethresholds", "nodevalue",
    "offset", "offsetbottom", "offsetleft", "offsetright", "offsettop",
    "onchange", "onclick", "onseriesclick", "onseriesdoubleclick", "options",
    "origin", "original", "padding", "palette", "paletteticks", "parent",
    "path", "percentile", "percentilemarkers", "percentiles", "period",
    "periods", "pinradius", "placeholders", "pointerposition", "portal",
    "position", "primarykey", "properties", "range", "rangemerge",
    "rangeoffset", "rangeselectend", "rangeselectstart", "rate",
    "ratecounter", "ratio", "refresh", "refreshinterval", "reload",
    "render", "replace", "replaceunderscore", "replacevalue", "responsive",
    "retaintimespan", "retryrefreshinterval", "rightaxis", "ringwidth",
    "rotatelegendticks", "rotatepaletteticks", "rotateticks", "rowalertstyle",
    "rowstyle", "rule", "scale", "scalex", "scaley", "script", "selectormode",
    "series", "serieslabels", "serieslimit", "seriestype", "seriesvalue",
    "server", "serveraggregate", "severity", "severitystyle", "showtagnames",
    "size", "sizename", "sort", "source", "stack", "start", "starttime",
    "startworkingminutes", "statistic", "statistics", "stepline", "style",
    "summarize", "summarizeperiod", "summarizestatistic", "svg", "table",
    "tableheaderstyle", "tag", "tagexpression", "tagoffset", "tags",
    "tagsdropdowns", "tagsdropdownsstyle", "tension", "threshold", "thresholds",
    "ticks", "ticksright", "tickstime", "timeoffset", "timespan", "timezone",
    "title", "tooltip", "topaxis", "topunits", "totalsize", "totalvalue",
    "transpose", "type", "unscale", "update", "updateinterval",
    "updatetimespan", "url", "urllegendticks", "urlparameters", "value",
    "verticalgrid", "widgets", "widgetsperrow", "width", "widthunits", "zoomsvg"
];

const possibleSections: string[] = [
    "column", "configuration", "dropdown", "group", "keys", "link", "node",
    "option", "other", "properties", "property", "series", "tag", "tags",
    "threshold", "widget"
];
