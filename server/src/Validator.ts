import { Diagnostic, DiagnosticSeverity, Location, TextDocument } from "vscode-languageserver/lib/main";
import FoundKeyword from "./FoundKeyword";
import * as resources from "./resources";
import Util from "./Util";

export default class Validator {
    private currentLineNumber: number = 0;
    private keywordsStack: FoundKeyword[] = [];
    private textDocument: TextDocument;
    private lines: string[];
    private currentSection: FoundKeyword;
    private previousSection: FoundKeyword;
    private settings: string[] = [];
    private previousSettings: string[] = [];
    private parentSettings: Map<string, string[]> = new Map<string, string[]>();
    private variables: Map<string, string[]> = new Map<string, string[]>();
    private ifSettings: Map<string, string[]> = new Map<string, string[]>();
    private aliases: string[] = [];
    private deAliases: FoundKeyword[] = [];
    private result: Diagnostic[] = [];
    private lastCondition: string;
    private match: RegExpExecArray;
    private csvColumns: number;

    constructor(textDocument: TextDocument) {
        this.textDocument = textDocument;
        this.lines = Util.deleteComments(textDocument.getText()).split("\n");
    }

    public lineByLine(): Diagnostic[] {

        for (this.currentLineNumber = 0; this.currentLineNumber < this.lines.length; this.currentLineNumber++) {
            const line = this.getCurrentLine();

            // prepare regex to let 'g' key do its work
            const foundKeyword = FoundKeyword.parse(line, this.currentLineNumber);

            if (this.areWeIn("script") && (!foundKeyword || foundKeyword.keyword !== "endscript")) {
                continue;
            } else if (this.areWeIn("csv") && (!foundKeyword || foundKeyword.keyword !== "endcsv")) {
                this.validateCsv();
            }

            this.eachLine();

            if (foundKeyword) {
                if (this.areWeIn("script") && foundKeyword.keyword !== "endscript") {
                    continue;
                } else if (/\b(if|for|csv)\b/i.test(foundKeyword.keyword)) {
                    this.keywordsStack.push(foundKeyword);
                }

                switch (foundKeyword.keyword) {
                    case "endfor": {
                        let forVariables = this.variables.get("forVariables");
                        if (!forVariables) { forVariables = []; }
                        forVariables.pop();
                        this.variables.set("forVariables", forVariables);
                    }
                    case "endif":
                    case "endvar":
                    case "endcsv":
                    case "endlist":
                    case "endfor":
                    case "endscript": {
                        const expectedEnd = foundKeyword.keyword.substring(3);
                        this.checkEnd(expectedEnd, foundKeyword);
                        break;
                    }
                    case "else":
                    case "elseif": {
                        this.setLastCondition();
                        let message: string = null;
                        if (!this.areWeIn("if")) {
                            message = `${foundKeyword.keyword} has no matching if`;
                        } else if (this.getLastKeyword() !== "if") {
                            message =
                                `${foundKeyword.keyword} has started before ${this.getLastKeyword()} has finished`;
                        }
                        if (message) {
                            this.result.push(Util.createDiagnostic(
                                { range: foundKeyword.range, uri: this.textDocument.uri },
                                DiagnosticSeverity.Error, message,
                            ));
                        }
                        break;
                    }
                    case "csv": {
                        let header: string;
                        if (/=[ \t]*$/m.test(line)) {
                            let j = this.currentLineNumber + 1;
                            header = this.getLine(j);
                            while (header && /^[ \t]*$/m.test(header)) {
                                header = this.getLine(++j);
                            }
                        } else { header = line.substring(/=/.exec(line).index + 1); }
                        this.match = /(^[ \t]*csv[ \t]+)(\w+)[ \t]*=/m.exec(line);
                        this.addToMap(this.variables, "csvNames", DiagnosticSeverity.Error);
                        this.csvColumns = Util.countCsvColumns(header);
                        break;
                    }
                    case "var": {
                        if (/=\s*(\[|\{)(|.*,)\s*$/m.test(line)) { this.keywordsStack.push(foundKeyword); }
                        this.match = /(var\s*)(\w+)\s*=/.exec(line);
                        this.addToMap(this.variables, "varNames", DiagnosticSeverity.Error);
                        break;
                    }
                    case "list": {
                        this.match = /(^\s*list\s+)(\w+)\s+=/.exec(line);
                        this.addToMap(this.variables, "listNames", DiagnosticSeverity.Error);
                        if (/(=|,)[ \t]*$/m.test(line)) {
                            this.keywordsStack.push(foundKeyword);
                        } else {
                            let j = this.currentLineNumber + 1;
                            while (this.getLine(j) && /^[ \t]*$/m.test(this.getLine(j))) {
                                j++;
                            }
                            if (this.getLine(j) &&
                                (/^[ \t]*,/.test(this.getLine(j)) || /\bendlist\b/.test(this.getLine(j)))) {
                                this.keywordsStack.push(foundKeyword);
                            }
                        }
                        break;
                    }
                    case "for": {
                        this.handleFor();
                        break;
                    }
                    case "if": {
                        this.setLastCondition();
                        break;
                    }
                    case "script": {
                        if (/^[ \t]*script[ \t]*=[ \t]*\S+.*$/m.test(line)) {
                            let j = this.currentLineNumber + 1;
                            while (!(/\bscript\b/.test(this.getLine(j)) || /\bendscript\b/.test(this.getLine(j)))) {
                                if (!this.getLine(++j)) { break; }
                            }
                            if (!this.getLine(j) || /\bscript\b/.test(this.getLine(j))) { break; }
                        }
                        this.keywordsStack.push(foundKeyword);
                        break;
                    }
                    default: {
                        console.log(`${foundKeyword.keyword} is not handled`);
                    }
                }
            }
        }

        this.checkAliases();
        this.diagnosticForLeftKeywords();
        this.checkPreviousSection();

        return this.result;
    }

    private checkAliases() {
        this.deAliases.forEach((deAlias) => {
            if (!Util.isInArray(this.aliases, deAlias.keyword)) {
                const message = Util.suggestionMessage(deAlias.keyword, this.aliases);
                this.result.push(Util.createDiagnostic(
                    { range: deAlias.range, uri: this.textDocument.uri },
                    DiagnosticSeverity.Error, message,
                ));
            }
        });
    }

    private setLastCondition() {
        this.lastCondition = this.currentLineNumber + this.getCurrentLine();
    }

    private handleFor() {
        const line = this.getCurrentLine();
        this.match = /(^\s*for\s+)(\w+)\s+in/m.exec(line);
        if (this.match) {
            const matching = this.match;
            this.match = /^(\s*for\s+\w+\s+in\s+)(\w+)\s*$/m.exec(line);
            if (this.match) {
                const variable = this.match[2];
                if (!Util.isInMap(variable, this.variables)) {
                    const message = Util.suggestionMessage(variable, Util.MapToArray(this.variables));
                    this.result.push(Util.createDiagnostic(
                        {
                            range: {
                                end: {
                                    character: this.match[1].length + variable.length,
                                    line: this.currentLineNumber,
                                },
                                start: {
                                    character: this.match[1].length,
                                    line: this.currentLineNumber,
                                },
                            }, uri: this.textDocument.uri,
                        },
                        DiagnosticSeverity.Error, message,
                    ));
                }
            } else {
                this.result.push(Util.createDiagnostic(
                    {
                        range: {
                            end: { character: matching[0].length + 2, line: this.currentLineNumber },
                            start: { character: matching[0].length + 1, line: this.currentLineNumber },
                        }, uri: this.textDocument.uri,
                    },
                    DiagnosticSeverity.Error, "Empty 'in' statement",
                ));
            }
            this.match = matching;
            this.addToMap(this.variables, "forVariables", DiagnosticSeverity.Error);
        }
    }

    private validateCsv() {
        const line = this.getCurrentLine();
        const columns = Util.countCsvColumns(line);
        if (columns !== this.csvColumns && !/^[ \t]*$/m.test(line)) {
            this.result.push(Util.createDiagnostic(
                {
                    range: {
                        end: { character: line.length, line: this.currentLineNumber },
                        start: { character: 0, line: this.currentLineNumber },
                    }, uri: this.textDocument.uri,
                },
                DiagnosticSeverity.Error, `Expected ${this.csvColumns} columns, but found ${columns}`,
            ));
        }
    }

    private areWeIn(name: string): boolean {
        return this.keywordsStack.find((item) => (item) ? item.keyword === name : false) !== undefined;
    }

    private getLastKeyword(): string | null {
        const stackHead = this.keywordsStack[this.keywordsStack.length - 1];
        return (stackHead) ? stackHead.keyword : null;
    }

    private diagnosticForLeftKeywords() {
        for (let i = 0, length = this.keywordsStack.length; i < length; i++) {
            const nestedConstruction = this.keywordsStack[i];
            if (!nestedConstruction) { continue; }
            this.result.push(Util.createDiagnostic(
                { range: nestedConstruction.range, uri: this.textDocument.uri }, DiagnosticSeverity.Error,
                `${nestedConstruction.keyword} has no matching end${nestedConstruction.keyword}`,
            ));
        }
    }

    private getCurrentLine(): string | null {
        return this.getLine(this.currentLineNumber);
    }

    private getLine(line: number): string | null {
        return (line < this.lines.length) ? this.lines[line].toLowerCase() : null;
    }

    private spellingCheck() {
        if (this.currentSection && /tags?|keys/.test(this.currentSection.keyword)) { return; }
        const line = this.getCurrentLine();

        /* statements like `[section] variable = value` aren't supported */
        if (!this.match) { this.match = /^(['" \t]*)([-\w]+)['" \t]*=/gm.exec(line); }
        if (this.match) {
            const indent = this.match[1].length;
            const word = this.match[2];
            const cleared = word.replace(/[^a-z]/g, "");
            let dictionary = resources.possibleOptions;
            if (this.match[0].endsWith("]")) {
                dictionary = resources.possibleSections;
            } else if (cleared.startsWith("column")) {
                return;
            }
            if (!Util.isInArray(dictionary, cleared)) {
                const message = Util.suggestionMessage(word, dictionary);
                this.result.push(Util.createDiagnostic({
                    range: {
                        end: { character: indent + word.length, line: this.currentLineNumber },
                        start: { character: indent, line: this.currentLineNumber },
                    },
                    uri: this.textDocument.uri,
                }, DiagnosticSeverity.Error, message));
            }
        }
    }

    private checkEnd(expectedEnd: string, foundKeyword: FoundKeyword) {
        const lastKeyword = this.getLastKeyword();
        if (!expectedEnd || !foundKeyword) { return; }
        if (lastKeyword === expectedEnd) {
            this.keywordsStack.pop();
            return;
        }
        if (!this.areWeIn(expectedEnd)) {
            this.result.push(Util.createDiagnostic(
                { range: foundKeyword.range, uri: this.textDocument.uri }, DiagnosticSeverity.Error,
                `${foundKeyword.keyword} has no matching ${expectedEnd}`,
            ));
        } else {
            const index = this.keywordsStack.findIndex((keyword) => keyword.keyword === expectedEnd);
            delete this.keywordsStack[index];
            this.result.push(Util.createDiagnostic(
                { range: foundKeyword.range, uri: this.textDocument.uri }, DiagnosticSeverity.Error,
                `${expectedEnd} has finished before ${lastKeyword}`,
            ));
        }
    }

    private addToMap(map: Map<string, string[]>, key: string, severity: DiagnosticSeverity): Map<string, string[]> {
        if (!map || !key || !severity || !this.match) { return map; }
        const variable = this.match[2];
        if (Util.isInMap(variable, map)) {
            const startPosition = this.match.index + this.match[1].length;
            this.result.push(Util.createDiagnostic(
                {
                    range: {
                        end: { character: startPosition + variable.length, line: this.currentLineNumber },
                        start: { character: startPosition, line: this.currentLineNumber },
                    },
                    uri: this.textDocument.uri,
                },
                severity, `${variable} is already defined`,
            ));
        } else {
            let array = map.get(key);
            if (!array) { array = []; }
            array.push(variable);
            map.set(key, array);
        }

        return map;
    }

    private checkPreviousSection() {
        if (!this.currentSection) { return; }
        const requiredSettings = resources.requiredSectionSettingsMap.get(this.currentSection.keyword);
        if (requiredSettings) {
            const notFound: string[] = [];
            requiredSettings.forEach((options) => {
                if (Util.isAnyInArray(options, this.settings)) {
                    return;
                }
                for (const array of this.parentSettings.values()) {
                    // trying to find in this section parents
                    if (Util.isAnyInArray(options, array)) {
                        return;
                    }
                }
                if (this.ifSettings && this.ifSettings.size !== 0) {
                    for (const array of this.ifSettings.values()) {
                        // trying to find in each one of if-elseif-else... statement
                        if (!Util.isAnyInArray(options, array)) {
                            notFound.push(options[0]);
                            return;
                        }
                    }
                    let ifCounter = 0;
                    let elseCounter = 0;
                    for (const statement of this.ifSettings.keys()) {
                        if (/\bif\b/.test(statement)) {
                            ifCounter++;
                        } else if (/\belse\b/.test(statement)) { elseCounter++; }
                    }
                    if (ifCounter !== elseCounter) { notFound.push(options[0]); }
                } else { notFound.push(options[0]); }
            });
            notFound.forEach((option) => {
                this.result.push(Util.createDiagnostic(
                    { range: this.currentSection.range, uri: this.textDocument.uri },
                    DiagnosticSeverity.Error, `${option} is required`,
                ));
            });
        }
    }

    private handleSection() {
        this.checkPreviousSection();
        if (!this.match) {
            if (this.previousSection) {
                this.currentSection = this.previousSection;
                this.settings = this.previousSettings;
            }
            return;
        }
        if (/widget/i.test(this.match[2])) { this.aliases = []; }
        this.previousSettings = this.settings;
        this.previousSection = this.currentSection;
        this.settings = [];
        this.ifSettings.clear();
        this.currentSection = {
            keyword: this.match[2],
            range: {
                end: { character: this.match[1].length + this.match[2].length, line: this.currentLineNumber },
                start: { character: this.match[1].length, line: this.currentLineNumber },
            },
        };
        if (Util.isInMap(this.currentSection.keyword, resources.parentSections)) {
            this.parentSettings.set(this.currentSection.keyword, []);
        }
    }

    private addToArray(array: string[], severity: DiagnosticSeverity): string[] {
        if (!this.match) { return array; }
        const variable = this.match[2];
        if (Util.isInArray(array, variable)) {
            this.result.push(Util.createDiagnostic(
                {
                    range: {
                        end: {
                            character: this.match[1].length + variable.length,
                            line: this.currentLineNumber,
                        },
                        start: { character: this.match[1].length, line: this.currentLineNumber },
                    },
                    uri: this.textDocument.uri,
                },
                severity, `${variable} is already defined`,
            ));
        } else {
            if (!array) { array = []; }
            array.push(variable);
        }

        return array;
    }

    private handleSettings() {
        const line = this.getCurrentLine();
        if (!this.currentSection || !/tags|keys/.test(this.currentSection.keyword)) {
            // we are not in tags or keys section
            // aliases
            this.match = /(^\s*alias\s*=\s*)(\w+)\s*$/m.exec(line);
            if (this.match) { this.addToArray(this.aliases, DiagnosticSeverity.Error); }
            this.match = /(^\s*value\s*=.*value\((['"]))(\w+)\2\).*$/.exec(line);
            if (this.match) {
                this.deAliases.push({
                    keyword: this.match[3], range: {
                        end: {
                            character: this.match[1].length + this.match[3].length,
                            line: this.currentLineNumber,
                        },
                        start: { character: this.match[1].length, line: this.currentLineNumber },
                    },
                });
            }

            // repetition
            // we don't have to perform null check
            // because we can't enter this method another way
            this.match = /(^\s*)([-\w]+)\s*=/.exec(line);
            const location: Location = {
                range: {
                    end: { character: this.match[1].length + this.match[2].length, line: this.currentLineNumber },
                    start: { character: this.match[1].length, line: this.currentLineNumber },
                }, uri: this.textDocument.uri,
            };
            const message = `${this.match[2]} is already defined`;

            if (this.areWeIn("if")) {
                let array = this.ifSettings.get(this.lastCondition);
                array = this.addToArray(array, DiagnosticSeverity.Warning);
                this.ifSettings.set(this.lastCondition, array);
                if (Util.isInArray(this.settings, this.match[2])) {
                    // the setting was defined before if
                    this.result.push(Util.createDiagnostic(location, DiagnosticSeverity.Warning, message));
                }
            } else { this.addToArray(this.settings, DiagnosticSeverity.Warning); }

            if (this.currentSection && Util.isInMap(this.currentSection.keyword, resources.parentSections)) {
                if (Util.isInMap(this.match[2], resources.requiredSectionSettingsMap)) {
                    this.addToMap(this.parentSettings, this.currentSection.keyword, DiagnosticSeverity.Hint);
                }
            } else {
                if (Util.isInMap(this.match[2], this.parentSettings)) {
                    // the setting was defined before in a parent section
                    this.result.push(Util.createDiagnostic(location, DiagnosticSeverity.Hint, message));
                }
            }
        } else if (/(^[ \t]*)([-\w]+)[ \t]*=/.test(line)) {
            // we are in tags/keys section
            this.match = /(^[ \t]*)([-\w]+)[ \t]*=/.exec(line);
            const setting = this.match[2].replace(/[^a-z]/g, "");
            const map = new Map<string, string[]>();
            map.set("possibleOptions", resources.possibleOptions);
            if (Util.isInMap(setting, map)) {
                this.result.push(Util.createDiagnostic(
                    {
                        range: {
                            end: {
                                character: this.match[1].length + this.match[2].length,
                                line: this.currentLineNumber,
                            },
                            start: { character: this.match[1].length, line: this.currentLineNumber },
                        },
                        uri: this.textDocument.uri,
                    },
                    DiagnosticSeverity.Information, `${setting} is interpreted as a tag`,
                ));
            }
        }

        // validate for variables
        this.validateFor();
    }

    private validateFor() {
        const line = this.getCurrentLine();
        if (this.areWeIn("for")) {
            const atRegexp = /@{.+?}/g;
            this.match = atRegexp.exec(line);
            while (this.match) {
                const substr = this.match[0];
                const startPosition = this.match.index;
                const varRegexp = /[a-zA-Z_]\w*(?!\w*["\('])/g;
                this.match = varRegexp.exec(substr);
                while (this.match) {
                    if (substr.charAt(this.match.index - 1) === ".") {
                        this.match = varRegexp.exec(substr);
                        continue;
                    }
                    const variable = this.match[0];
                    if (!Util.isInMap(variable, this.variables)) {
                        const position = startPosition + this.match.index;
                        const message = Util.suggestionMessage(variable, Util.MapToArray(this.variables));
                        this.result.push(Util.createDiagnostic(
                            {
                                range: {
                                    end: {
                                        character: position + variable.length,
                                        line: this.currentLineNumber,
                                    },
                                    start: { character: position, line: this.currentLineNumber },
                                }, uri: this.textDocument.uri,
                            },
                            DiagnosticSeverity.Error, message,
                        ));
                    }
                    this.match = varRegexp.exec(substr);
                }
                this.match = atRegexp.exec(line);
            }
        }
    }

    private eachLine() {
        const line = this.getCurrentLine();
        this.match = /(^[\t ]*\[)(\w+)\][\t ]*/.exec(line);
        if (this.match || (/^\s*$/.test(line) && this.currentSection && this.currentSection.keyword === "tags")) {
            this.handleSection();
        } else {
            this.match = /(^\s*)(\S+)\s*=\s*(.+)$/m.exec(line);
            if (this.match) { this.handleSettings(); }
        }
        this.match = /(^[\t ]*\[)(\w+)\][\t ]*/m.exec(line);
        this.spellingCheck();
    }
}
