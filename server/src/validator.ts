import { Diagnostic, DiagnosticSeverity, Location, TextDocument } from "vscode-languageserver";
import { FoundKeyword } from "./foundKeyword";
import * as resources from "./resources";
import {
    countCsvColumns, createDiagnostic, deleteComments, isAnyInArray, isInArray, isInMap, mapToArray, suggestionMessage,
} from "./util";

export class Validator {
    private static readonly CONTENT_POSITION: number = 2;
    private aliases: string[] = [];
    private csvColumns: number;
    private currentLineNumber: number = 0;
    private currentSection: FoundKeyword;
    private readonly deAliases: FoundKeyword[] = [];
    private foundKeyword: FoundKeyword;
    private readonly ifSettings: Map<string, string[]> = new Map<string, string[]>();
    private readonly keywordsStack: FoundKeyword[] = [];
    private lastCondition: string;
    private readonly lines: string[];
    private match: RegExpExecArray;
    private readonly parentSettings: Map<string, string[]> = new Map<string, string[]>();
    private previousSection: FoundKeyword;
    private previousSettings: string[] = [];
    private requiredSettings: string[][] = [];
    private readonly result: Diagnostic[] = [];
    private settings: string[] = [];
    private readonly textDocument: TextDocument;
    private urlParameters: string[];
    private readonly variables: Map<string, string[]> = new Map<string, string[]>();

    public constructor(textDocument: TextDocument) {
        this.textDocument = textDocument;
        this.lines = deleteComments(textDocument.getText())
            .split("\n");
    }

    public lineByLine(): Diagnostic[] {
        for (this.currentLineNumber = 0; this.currentLineNumber < this.lines.length; this.currentLineNumber++) {
            const line: string = this.getCurrentLine();

            // Prepare regex to let 'g' key do its work
            this.foundKeyword = FoundKeyword.parse(line, this.currentLineNumber);

            if (this.areWeIn("script") && (!this.foundKeyword || this.foundKeyword.keyword !== "endscript")) {
                continue;
            } else if (this.areWeIn("csv") && (!this.foundKeyword || this.foundKeyword.keyword !== "endcsv")) {
                this.validateCsv();
            }

            this.eachLine();

            if (this.foundKeyword) {
                if (/\b(if|for|csv)\b/i.test(this.foundKeyword.keyword)) {
                    this.keywordsStack.push(this.foundKeyword);
                }

                this.switchKeyword();
            }
        }

        this.checkAliases();
        this.diagnosticForLeftKeywords();
        this.checkPreviousSection();

        return this.result;
    }

    private addToArray(array: string[], severity: DiagnosticSeverity): string[] {
        let result: string[] = array;
        if (!this.match) { return result; }
        const variable: string = this.match[Validator.CONTENT_POSITION];
        if (isInArray(array, variable)) {
            this.result.push(createDiagnostic(
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
            if (!result) { result = []; }
            result.push(variable);
        }

        return result;
    }

    private addToMap(map: Map<string, string[]>, key: string, severity: DiagnosticSeverity): Map<string, string[]> {
        if (!map || !key || !severity || !this.match) { return map; }
        const variable: string = this.match[Validator.CONTENT_POSITION];
        if (isInMap(variable, map)) {
            const startPosition: number = this.match.index + this.match[1].length;
            this.result.push(createDiagnostic(
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
            let array: string[] = map.get(key);
            if (!array) { array = []; }
            array.push(variable);
            map.set(key, array);
        }

        return map;
    }

    private areWeIn(name: string): boolean {
        return this.keywordsStack.find((item: FoundKeyword) => (item) ? item.keyword === name : false) !== undefined;
    }

    private checkAliases(): void {
        this.deAliases.forEach((deAlias: FoundKeyword) => {
            if (!isInArray(this.aliases, deAlias.keyword)) {
                const message: string = suggestionMessage(deAlias.keyword, this.aliases);
                this.result.push(createDiagnostic(
                    { range: deAlias.range, uri: this.textDocument.uri },
                    DiagnosticSeverity.Error, message,
                ));
            }
        });
    }

    private checkEnd(expectedEnd: string): void {
        const lastKeyword: string = this.getLastKeyword();
        if (!expectedEnd || !this.foundKeyword) { return; }
        if (lastKeyword === expectedEnd) {
            this.keywordsStack.pop();

            return;
        }
        if (!this.areWeIn(expectedEnd)) {
            this.result.push(createDiagnostic(
                { range: this.foundKeyword.range, uri: this.textDocument.uri }, DiagnosticSeverity.Error,
                `${this.foundKeyword.keyword} has no matching ${expectedEnd}`,
            ));
        } else {
            const index: number =
                this.keywordsStack.findIndex((keyword: FoundKeyword) => keyword.keyword === expectedEnd);
            this.keywordsStack.splice(index, 1);
            this.result.push(createDiagnostic(
                { range: this.foundKeyword.range, uri: this.textDocument.uri }, DiagnosticSeverity.Error,
                `${expectedEnd} has finished before ${lastKeyword}`,
            ));
        }
    }

    private checkPreviousSection(): void {
        if (!this.currentSection) { return; }
        this.requiredSettings =
            this.requiredSettings.concat(resources.requiredSectionSettingsMap.get(this.currentSection.keyword));
        if (this.requiredSettings.length !== 0) {
            const notFound: string[] = [];
            this.requiredSettings.forEach((options: string[]) => {
                if (isAnyInArray(options, this.settings)) {
                    return;
                }
                for (const array of this.parentSettings.values()) {
                    // Trying to find in this section parents
                    if (isAnyInArray(options, array)) {
                        return;
                    }
                }
                if (this.ifSettings && this.ifSettings.size !== 0) {
                    for (const array of this.ifSettings.values()) {
                        // Trying to find in each one of if-elseif-else... statement
                        if (!isAnyInArray(options, array)) {
                            notFound.push(options[0]);

                            return;
                        }
                    }
                    let ifCounter: number = 0;
                    let elseCounter: number = 0;
                    for (const statement of this.ifSettings.keys()) {
                        if (/\bif\b/.test(statement)) {
                            ifCounter++;
                        } else if (/\belse\b/.test(statement)) { elseCounter++; }
                    }
                    if (ifCounter !== elseCounter) { notFound.push(options[0]); }
                } else { notFound.push(options[0]); }
            });
            notFound.forEach((option: string) => {
                this.result.push(createDiagnostic(
                    { range: this.currentSection.range, uri: this.textDocument.uri },
                    DiagnosticSeverity.Error, `${option} is required`,
                ));
            });
        }
        this.requiredSettings = [];
    }

    private checkRepetition(): void {
        const setting: string = this.match[Validator.CONTENT_POSITION].replace(/[^a-z]/g, "");
        const location: Location = {
            range: {
                end: {
                    character: this.match[1].length + this.match[Validator.CONTENT_POSITION].length,
                    line: this.currentLineNumber,
                },
                start: { character: this.match[1].length, line: this.currentLineNumber },
            },
            uri: this.textDocument.uri,
        };
        const message: string = `${this.match[Validator.CONTENT_POSITION]} is already defined`;

        if (this.areWeIn("if")) {
            let array: string[] = this.ifSettings.get(this.lastCondition);
            array = this.addToArray(array, DiagnosticSeverity.Warning);
            this.ifSettings.set(this.lastCondition, array);
            if (isInArray(this.settings, setting)) {
                // The setting was defined before if
                this.result.push(createDiagnostic(location, DiagnosticSeverity.Warning, message));
            }
        } else { this.addToArray(this.settings, DiagnosticSeverity.Warning); }

        if (this.currentSection && isInMap(this.currentSection.keyword, resources.parentSections)) {
            if (isInMap(setting, resources.requiredSectionSettingsMap)) {
                this.addToMap(this.parentSettings, this.currentSection.keyword, DiagnosticSeverity.Hint);
            }
        } else {
            if (isInMap(setting, this.parentSettings)) {
                // The setting was defined before in a parent section
                this.result.push(createDiagnostic(location, DiagnosticSeverity.Hint, message));
            }
        }
    }

    private diagnosticForLeftKeywords(): void {
        const length: number = this.keywordsStack.length;
        for (let i: number = 0; i < length; i++) {
            const nestedConstruction: FoundKeyword = this.keywordsStack[i];
            if (!nestedConstruction) { continue; }
            this.result.push(createDiagnostic(
                { range: nestedConstruction.range, uri: this.textDocument.uri }, DiagnosticSeverity.Error,
                `${nestedConstruction.keyword} has no matching end${nestedConstruction.keyword}`,
            ));
        }
    }

    private eachLine(): void {
        const line: string = this.getCurrentLine();
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

    private getCurrentLine(): string | undefined {
        return this.getLine(this.currentLineNumber);
    }

    private getLastKeyword(): string | undefined {
        const stackHead: FoundKeyword = this.keywordsStack[this.keywordsStack.length - 1];

        return (stackHead) ? stackHead.keyword : undefined;
    }

    private getLine(line: number): string | undefined {
        return (line < this.lines.length) ? this.lines[line].toLowerCase() : undefined;
    }

    private handleCsv(): void {
        const line: string = this.getCurrentLine();
        let header: string;
        if (/=[ \t]*$/m.test(line)) {
            let j: number = this.currentLineNumber + 1;
            header = this.getLine(j);
            while (header && /^[ \t]*$/m.test(header)) {
                header = this.getLine(++j);
            }
        } else { header = line.substring(/=/.exec(line).index + 1); }
        this.match = /(^[ \t]*csv[ \t]+)(\w+)[ \t]*=/m.exec(line);
        this.addToMap(this.variables, "csvNames", DiagnosticSeverity.Error);
        this.csvColumns = countCsvColumns(header);
    }

    private handleElse(): void {
        this.setLastCondition();
        let message: string;
        if (!this.areWeIn("if")) {
            message = `${this.foundKeyword.keyword} has no matching if`;
        } else if (this.getLastKeyword() !== "if") {
            message =
                `${this.foundKeyword.keyword} has started before ${this.getLastKeyword()} has finished`;
        }
        if (message) {
            this.result.push(createDiagnostic(
                { range: this.foundKeyword.range, uri: this.textDocument.uri },
                DiagnosticSeverity.Error, message,
            ));
        }
    }

    private handleEndFor(): void {
        let forVariables: string[] = this.variables.get("forVariables");
        if (!forVariables) { forVariables = []; }
        forVariables.pop();
        this.variables.set("forVariables", forVariables);
    }

    private handleFor(): void {
        const line: string = this.getCurrentLine();
        this.match = /(^\s*for\s+)(\w+)\s+in/m.exec(line);
        if (this.match) {
            const matching: RegExpExecArray = this.match;
            this.match = /^(\s*for\s+\w+\s+in\s+)(\w+)\s*$/m.exec(line);
            if (this.match) {
                const variable: string = this.match[Validator.CONTENT_POSITION];
                if (!isInMap(variable, this.variables)) {
                    const message: string = suggestionMessage(variable, mapToArray(this.variables));
                    this.result.push(createDiagnostic(
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
                            },
                            uri: this.textDocument.uri,
                        },
                        DiagnosticSeverity.Error, message,
                    ));
                }
            } else {
                this.result.push(createDiagnostic(
                    {
                        range: {
                            end: { character: matching[0].length + "or".length, line: this.currentLineNumber },
                            start: { character: matching[0].length + 1, line: this.currentLineNumber },
                        },
                        uri: this.textDocument.uri,
                    },
                    DiagnosticSeverity.Error, "Empty 'in' statement",
                ));
            }
            this.match = matching;
            this.addToMap(this.variables, "forVariables", DiagnosticSeverity.Error);
        }
    }

    private handleList(): void {
        const line: string = this.getCurrentLine();
        this.match = /(^\s*list\s+)(\w+)\s+=/.exec(line);
        this.addToMap(this.variables, "listNames", DiagnosticSeverity.Error);
        if (/(=|,)[ \t]*$/m.test(line)) {
            this.keywordsStack.push(this.foundKeyword);
        } else {
            let j: number = this.currentLineNumber + 1;
            while (this.getLine(j) && /^[ \t]*$/m.test(this.getLine(j))) {
                j++;
            }
            if (this.getLine(j) &&
                (/^[ \t]*,/.test(this.getLine(j)) || /\bendlist\b/.test(this.getLine(j)))) {
                this.keywordsStack.push(this.foundKeyword);
            }
        }
    }

    private handleScript(): void {
        if (/^[ \t]*script[ \t]*=[ \t]*\S+.*$/m.test(this.getCurrentLine())) {
            let j: number = this.currentLineNumber + 1;
            while (!(/\bscript\b/.test(this.getLine(j)) || /\bendscript\b/.test(this.getLine(j)))) {
                if (!this.getLine(++j)) { break; }
            }
            if (!this.getLine(j) || /\bscript\b/.test(this.getLine(j))) { return; }
        }
        this.keywordsStack.push(this.foundKeyword);
    }

    private handleSection(): void {
        this.checkPreviousSection();
        if (!this.match) {
            if (this.previousSection) {
                this.currentSection = this.previousSection;
                this.settings = this.previousSettings;
            }

            return;
        }
        if (/widget/i.test(this.match[Validator.CONTENT_POSITION])) { this.aliases = []; }
        this.previousSettings = this.settings;
        this.previousSection = this.currentSection;
        this.settings = [];
        this.ifSettings.clear();
        this.currentSection = {
            keyword: this.match[Validator.CONTENT_POSITION],
            range: {
                end: {
                    character: this.match[1].length + this.match[Validator.CONTENT_POSITION].length,
                    line: this.currentLineNumber,
                },
                start: { character: this.match[1].length, line: this.currentLineNumber },
            },
        };
        if (isInMap(this.currentSection.keyword, resources.parentSections)) {
            this.parentSettings.set(this.currentSection.keyword, []);
        }
    }

    private handleSettings(): void {
        const line: string = this.getCurrentLine();
        if (!this.currentSection || !/tags|keys/.test(this.currentSection.keyword)) {
            // We are not in tags or keys section
            // Aliases
            this.match = /(^\s*alias\s*=\s*)(\w+)\s*$/m.exec(line);
            if (this.match) { this.addToArray(this.aliases, DiagnosticSeverity.Error); }
            this.match = /(^\s*value\s*=.*value\((['"]))(\w+)\2\).*$/.exec(line);
            const deAliasPosition: number = 3;
            if (this.match) {
                this.deAliases.push({
                    keyword: this.match[deAliasPosition], range: {
                        end: {
                            character: this.match[1].length + this.match[deAliasPosition].length,
                            line: this.currentLineNumber,
                        },
                        start: { character: this.match[1].length, line: this.currentLineNumber },
                    },
                });
            }

            this.match = /(^\s*)([-\w]+)\s*=/.exec(this.getCurrentLine());
            const setting: string = this.match[Validator.CONTENT_POSITION].replace(/[^a-z]/g, "");
            if (setting === "table") {
                this.requiredSettings.push(["attribute"]);
            } else if (setting === "attribute") {
                this.requiredSettings.push(["table"]);
            }

            if (setting !== "onseriesclick") {
                this.checkRepetition();
            }

            if (setting === "urlparameters") {
                this.urlParameters = [];
                const regexp: RegExp = /{(.+?)}/g;
                this.match = regexp.exec(line);
                while (this.match) {
                    const cleared: string = this.match[1].replace(/[^a-z]/g, "");
                    this.urlParameters.push(cleared);
                    this.match = regexp.exec(line);
                }
            }
        } else if (/(^[ \t]*)([-\w]+)[ \t]*=/.test(line)) {
            // We are in tags/keys section
            this.match = /(^[ \t]*)([-\w]+)[ \t]*=/.exec(line);
            const setting: string = this.match[Validator.CONTENT_POSITION].replace(/[^a-z]/g, "");
            const map: Map<string, string[]> = new Map<string, string[]>();
            map.set("possibleOptions", resources.possibleOptions);
            if (isInMap(setting, map)) {
                this.result.push(createDiagnostic(
                    {
                        range: {
                            end: {
                                character: this.match[1].length + this.match[Validator.CONTENT_POSITION].length,
                                line: this.currentLineNumber,
                            },
                            start: { character: this.match[1].length, line: this.currentLineNumber },
                        },
                        uri: this.textDocument.uri,
                    },
                    DiagnosticSeverity.Information, `${this.match[Validator.CONTENT_POSITION]} is interpreted as a tag`,
                ));
            }
        }

        this.validateFor();
    }

    private setLastCondition(): void {
        this.lastCondition = this.currentLineNumber + this.getCurrentLine();
    }

    private spellingCheck(): void {
        if (this.currentSection && /tags?|keys/.test(this.currentSection.keyword)) { return; }
        const line: string = this.getCurrentLine();

        /* statements like `[section] variable = value` aren't supported */
        if (!this.match) { this.match = /^(['" \t]*)([-\w]+)['" \t]*=/gm.exec(line); }
        if (this.match) {
            const indent: number = this.match[1].length;
            const word: string = this.match[Validator.CONTENT_POSITION];
            const cleared: string = word.replace(/[^a-z]/g, "");
            let dictionary: string[] = resources.possibleOptions;
            if (this.match[0].endsWith("]")) {
                dictionary = resources.possibleSections;
            } else if (cleared.startsWith("column")) {
                return;
            }
            if (this.currentSection && this.currentSection.keyword === "placeholders") {
                dictionary = dictionary.concat(this.urlParameters);
            }
            if (!isInArray(dictionary, cleared)) {
                const message: string = suggestionMessage(word, dictionary);
                this.result.push(createDiagnostic(
                    {
                        range: {
                            end: { character: indent + word.length, line: this.currentLineNumber },
                            start: { character: indent, line: this.currentLineNumber },
                        },
                        uri: this.textDocument.uri,
                    },
                    DiagnosticSeverity.Error,
                    message,
                ));
            }
        }
    }

    private switchKeyword(): void {
        const line: string = this.getCurrentLine();
        switch (this.foundKeyword.keyword) {
            case "endfor": this.handleEndFor();
            case "endif":
            case "endvar":
            case "endcsv":
            case "endlist":
            case "endscript": {
                const expectedEnd: string = this.foundKeyword.keyword.substring("end".length);
                this.checkEnd(expectedEnd);
                break;
            }
            case "else":
            case "elseif": {
                this.handleElse();
                break;
            }
            case "csv": {
                this.handleCsv();
                break;
            }
            case "var": {
                if (/=\s*(\[|\{)(|.*,)\s*$/m.test(line)) { this.keywordsStack.push(this.foundKeyword); }
                this.match = /(var\s*)(\w+)\s*=/.exec(line);
                this.addToMap(this.variables, "varNames", DiagnosticSeverity.Error);
                break;
            }
            case "list": {
                this.handleList();
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
                this.handleScript();
                break;
            }
            default: throw new Error(`${this.foundKeyword.keyword} is not handled`);
        }
    }

    private validateCsv(): void {
        const line: string = this.getCurrentLine();
        const columns: number = countCsvColumns(line);
        if (columns !== this.csvColumns && !/^[ \t]*$/m.test(line)) {
            this.result.push(createDiagnostic(
                {
                    range: {
                        end: { character: line.length, line: this.currentLineNumber },
                        start: { character: 0, line: this.currentLineNumber },
                    },
                    uri: this.textDocument.uri,
                },
                DiagnosticSeverity.Error, `Expected ${this.csvColumns} columns, but found ${columns}`,
            ));
        }
    }

    private validateFor(): void {
        const line: string = this.getCurrentLine();
        if (this.areWeIn("for")) {
            const atRegexp: RegExp = /@{.+?}/g;
            this.match = atRegexp.exec(line);
            while (this.match) {
                const substr: string = this.match[0];
                const startPosition: number = this.match.index;
                const varRegexp: RegExp = /[a-zA-Z_]\w*(?!\w*["\('])/g;
                this.match = varRegexp.exec(substr);
                while (this.match) {
                    if (substr.charAt(this.match.index - 1) === ".") {
                        this.match = varRegexp.exec(substr);
                        continue;
                    }
                    const variable: string = this.match[0];
                    if (!isInMap(variable, this.variables)) {
                        const position: number = startPosition + this.match.index;
                        const message: string = suggestionMessage(variable, mapToArray(this.variables));
                        this.result.push(createDiagnostic(
                            {
                                range: {
                                    end: {
                                        character: position + variable.length,
                                        line: this.currentLineNumber,
                                    },
                                    start: { character: position, line: this.currentLineNumber },
                                },
                                uri: this.textDocument.uri,
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
}
