import { Diagnostic, DiagnosticSeverity, Position, Range } from "vscode-languageserver";
import {
    booleanRegExp, getParents, integerRegExp, intervalRegExp, numberRegExp, parentSections,
    possibleSections,
    requiredSectionSettingsMap,
} from "./resources";
import { Setting } from "./setting";
import { TextRange } from "./textRange";
import {
    addDisplayNames, countCsvColumns, createDiagnostic, deleteComments, getSetting, isAnyInArray,
    isDate, isInMap, mapToArray, suggestionMessage,
} from "./util";

export class Validator {
    private static readonly CONTENT_POSITION: number = 2;
    private aliases: string[] = [];
    private csvColumns: number;
    private currentLineNumber: number = 0;
    private currentSection: TextRange;
    private currentSettings: Setting[] = [];
    private deAliases: TextRange[] = [];
    private foundKeyword: TextRange;
    private readonly ifSettings: Map<string, Setting[]> = new Map<string, Setting[]>();
    private readonly keywordsStack: TextRange[] = [];
    private lastCondition: string;
    private readonly lines: string[];
    private match: RegExpExecArray;
    private readonly parentSettings: Map<string, Setting[]> = new Map<string, Setting[]>();
    private previousSection: TextRange;
    private previousSettings: Setting[] = [];
    private requiredSettings: Setting[][] = [];
    private readonly result: Diagnostic[] = [];
    private urlParameters: string[];
    private readonly variables: Map<string, string[]> = new Map<string, string[]>();

    public constructor(text: string) {
        this.lines = deleteComments(text)
            .split("\n");
    }

    /**
     * Iterates over the document content line by line
     * @returns diagnostics for all found mistakes
     */
    public lineByLine(): Diagnostic[] {
        this.lines.forEach((line: string, index: number) => {
            this.currentLineNumber = index;
            this.foundKeyword = TextRange.parse(line, this.currentLineNumber);

            if (this.areWeIn("script") && (!this.foundKeyword || this.foundKeyword.text !== "endscript")) {
                return;
            }
            if (this.areWeIn("csv") && (!this.foundKeyword || this.foundKeyword.text !== "endcsv")) {
                this.validateCsv();
            }

            this.eachLine();

            if (this.foundKeyword) {
                if (/\b(if|for|csv)\b/i.test(this.foundKeyword.text)) {
                    this.keywordsStack.push(this.foundKeyword);
                }

                this.switchKeyword();
            }
        });

        this.checkAliases();
        this.diagnosticForLeftKeywords();
        this.checkPreviousSection();

        return this.result;
    }

    /**
     * Adds all current section setting to parent
     * if they're required by a section
     */
    private addCurrentToParentSettings(): void {
        if (this.currentSection) {
            for (const setting of this.currentSettings) {
                this.addToSettingMap(this.currentSection.text, setting);
            }
        }
    }

    /**
     * Adds a setting based on this.match to array
     * or creates a new diagnostic if setting is already present
     * @param array the target array
     * @returns the array containing the setting from this.match
     */
    private addToSettingArray(array: Setting[]): Setting[] {
        const result: Setting[] = (array) ? array : [];
        const name: string = this.match[Validator.CONTENT_POSITION];
        const variable: Setting = getSetting(name);
        if (!variable) {
            return result;
        }
        if (array && array.includes(variable)) {
            this.result.push(createDiagnostic(
                Range.create(
                    Position.create(this.currentLineNumber, this.match[1].length),
                    Position.create(this.currentLineNumber, this.match[1].length + name.length),
                ),
                DiagnosticSeverity.Error, `${name} is already defined`,
            ));
        } else {
            result.push(variable);
        }

        return result;
    }

    /**
     * Adds a setting based on this.match to the target map
     * or creates a new diagnostic if setting is already present
     * @param map the target map
     * @param key the key, which value will contain the setting
     * @returns the map regardless was it modified or not
     */
    private addToSettingMap(key: string, setting: Setting): void {
        if (!setting) {
            return;
        }
        if (!isInMap(setting, this.parentSettings)) {
            let array: Setting[] = this.parentSettings.get(key);
            if (!array) {
                array = [];
            }
            array.push(setting);
            this.parentSettings.set(key, array);
        }
    }

    /**
     * Adds a string based on this.match to the array
     * or creates a diagnostic if the string is already present
     * @param array  the target array
     * @returns the array regardless was it modified or not
     */
    private addToStringArray(array: string[]): string[] {
        let result: string[] = array;
        if (!this.match) {
            return result;
        }
        const variable: string = this.match[Validator.CONTENT_POSITION];
        if (array && array.includes(variable)) {
            this.result.push(createDiagnostic(
                Range.create(
                    Position.create(this.currentLineNumber, this.match[1].length),
                    Position.create(this.currentLineNumber, this.match[1].length + variable.length),
                ),
                DiagnosticSeverity.Error, `${variable} is already defined`,
            ));
        } else {
            if (!result) {
                result = [];
            }
            result.push(variable);
        }

        return result;
    }

    /**
     * Adds a string based on this.match to a value of the provided key
     * @param map the target map
     * @param key the key which value will contain the setting
     * @returns the map regardless was it modified or not
     */
    private addToStringMap(map: Map<string, string[]>, key: string): Map<string, string[]> {
        if (!map || !key || !this.match) { return map; }
        const variable: string = this.match[Validator.CONTENT_POSITION];
        if (isInMap(variable, map)) {
            const startPosition: number = this.match.index + this.match[1].length;
            this.result.push(createDiagnostic(
                Range.create(
                    Position.create(this.currentLineNumber, startPosition),
                    Position.create(this.currentLineNumber, startPosition + variable.length),
                ),
                DiagnosticSeverity.Error, `${variable} is already defined`,
            ));
        } else {
            let array: string[] = map.get(key);
            if (!array) {
                array = [];
            }
            array.push(variable);
            map.set(key, array);
        }

        return map;
    }

    /**
     * Tests if keywordsStack contain the provided name or not
     * @param name the target keyword name
     * @return true, if stack contains the keyword, false otherwise
     */
    private areWeIn(name: string): boolean {
        return this.keywordsStack
            .map((textRange: TextRange): string => textRange.text)
            .includes(name);
    }

    /**
     * Checks that each de-alias has corresponding alias
     */
    private checkAliases(): void {
        this.deAliases.forEach((deAlias: TextRange) => {
            if (!this.aliases || !this.aliases.includes(deAlias.text)) {
                this.result.push(createDiagnostic(
                    deAlias.range, DiagnosticSeverity.Error, suggestionMessage(deAlias.text, this.aliases),
                ));
            }
        });
    }

    /**
     * Tests that user has finished a corresponding keyword
     * For instance, user can write "endfor" instead of "endif"
     * @param expectedEnd What the user has finished?
     */
    private checkEnd(expectedEnd: string): void {
        const lastKeyword: string = this.getLastKeyword();
        if (!expectedEnd || !this.foundKeyword) { return; }
        if (lastKeyword === expectedEnd) {
            this.keywordsStack.pop();

            return;
        }
        if (!this.areWeIn(expectedEnd)) {
            this.result.push(createDiagnostic(
                this.foundKeyword.range, DiagnosticSeverity.Error,
                `${this.foundKeyword.text} has no matching ${expectedEnd}`,
            ));
        } else {
            const index: number =
                this.keywordsStack.findIndex((keyword: TextRange) => keyword.text === expectedEnd);
            this.keywordsStack.splice(index, 1);
            this.result.push(createDiagnostic(
                this.foundKeyword.range, DiagnosticSeverity.Error,
                `${expectedEnd} has finished before ${lastKeyword}`,
            ));
        }
    }

    /**
     * Check that the section does not contain settings
     * Which are excluded by the specified one
     * @param setting the specified setting
     */
    private checkExcludes(setting: Setting): void {
        this.currentSettings.forEach((item: Setting): void => {
            if (setting.excludes.includes(item.displayName)) {
                const range: Range = Range.create(
                    this.currentLineNumber, this.match[1].length,
                    this.currentLineNumber, this.match[1].length + this.match[Validator.CONTENT_POSITION].length,
                );
                this.result.push(createDiagnostic(
                    range, DiagnosticSeverity.Error,
                    `${setting.displayName} can not be specified simultaneously with ${item.displayName}`,
                ));
            }
        });
    }

    /**
     * Creates a diagnostic if the current line contains FreeMarker expressions
     */
    private checkFreemarker(): void {
        const line: string = this.getCurrentLine();
        this.match = /<#(?:list|assign)/.exec(line);
        if (this.match) {
            this.result.push(createDiagnostic(
                Range.create(
                    this.currentLineNumber, this.match.index,
                    this.currentLineNumber, this.match.index + this.match[0].length,
                ),
                DiagnosticSeverity.Information,
                "Freemarker expressions are deprecated. Use a native collection: list, csv table, var object.",
            ));
        }
    }

    /**
     * Creates diagnostics if a section does not contain required settings
     */
    private checkPreviousSection(): void {
        if (!this.currentSection) { return; }
        this.requiredSettings =
            this.requiredSettings.concat(requiredSectionSettingsMap.get(this.currentSection.text));
        if (this.requiredSettings.length !== 0) {
            const notFound: string[] = [];
            this.requiredSettings
                .filter((options: Setting[]): boolean => options !== undefined && options !== null)
                .forEach((options: Setting[]): void => {
                    const displayName: string = options[0].displayName;
                    if (isAnyInArray(options, this.currentSettings)) {
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
                                notFound.push(displayName);

                                return;
                            }
                        }
                        let ifCounter: number = 0;
                        let elseCounter: number = 0;
                        for (const statement of this.ifSettings.keys()) {
                            if (/\bif\b/.test(statement)) {
                                ifCounter++;
                            } else if (/\belse\b/.test(statement)) {
                                elseCounter++;
                            }
                        }
                        if (ifCounter !== elseCounter) { notFound.push(displayName); }
                    } else { notFound.push(displayName); }
                });
            notFound.forEach((option: string) => {
                this.result.push(createDiagnostic(
                    this.currentSection.range, DiagnosticSeverity.Error, `${option} is required`,
                ));
            });
        }
        this.requiredSettings = [];
    }

    /**
     * Creates a new diagnostic if the provided setting is defined
     * @param setting the setting to perform check
     */
    private checkRepetition(setting: Setting): void {
        const location: Range = Range.create(
            this.currentLineNumber, this.match[1].length,
            this.currentLineNumber, this.match[1].length + this.match[Validator.CONTENT_POSITION].length,
        );
        const message: string = `${this.match[Validator.CONTENT_POSITION]} is already defined`;

        if (this.areWeIn("if")) {
            let array: Setting[] = this.ifSettings.get(this.lastCondition);
            array = this.addToSettingArray(array);
            this.ifSettings.set(this.lastCondition, array);
            if (this.currentSettings && this.currentSettings.includes(setting)) {
                // The setting was defined before if
                this.result.push(createDiagnostic(location, DiagnosticSeverity.Error, message));
            }
        } else {
            this.addToSettingArray(this.currentSettings);
        }

        if (this.checkShadowing(setting)) {
            // The setting was defined before in a parent section
            this.result.push(createDiagnostic(location, DiagnosticSeverity.Hint, message));
        }
    }

    /**
     * Creates diagnostics for each shadowed setting
     * Shadowed setting - setting declared previously in a parent section
     * @param setting the setting to check
     * @returns true, if setting was declared before
     */
    private checkShadowing(setting: Setting): boolean {
        if (this.currentSection) {
            for (const parent of getParents(this.currentSection.text)) {
                const parentSettings: Setting[] = this.parentSettings.get(parent);
                if (parentSettings && parentSettings.includes(setting)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Creates diagnostics for all unclosed keywords
     */
    private diagnosticForLeftKeywords(): void {
        const length: number = this.keywordsStack.length;
        for (let i: number = 0; i < length; i++) {
            const nestedConstruction: TextRange = this.keywordsStack[i];
            if (!nestedConstruction) { continue; }
            this.result.push(createDiagnostic(
                nestedConstruction.range, DiagnosticSeverity.Error,
                `${nestedConstruction.text} has no matching end${nestedConstruction.text}`,
            ));
        }
    }

    /**
     * Handles every line in the document, calls corresponding functions
     */
    private eachLine(): void {
        this.checkFreemarker();
        const line: string = this.getCurrentLine();
        this.match = /(^[\t ]*\[)(\w+)\][\t ]*/.exec(line);
        if (this.match || (/^\s*$/.test(line) && this.currentSection && this.currentSection.text === "tags")) {
            if (this.match) {
                this.spellingCheck();
            }
            this.handleSection();
        } else {
            this.match = /(^\s*)(.+?)\s*=\s*(.+?)\s*$/m.exec(line);
            if (this.match) {
                this.handleSettings();
                if (this.areWeIn("for")) {
                    this.validateFor();
                }
            }
        }
    }

    /**
     * Adds all de-aliases from the line to the corresponding array
     */
    private findDeAliases(): void {
        const line: string = this.getCurrentLine();
        const regexp: RegExp = /value\((['"])(\S+)\1\)/g;
        const deAliasPosition: number = 2;
        this.match = regexp.exec(line);
        while (this.match) {
            this.deAliases.push(TextRange.create(this.match[deAliasPosition], Range.create(
                this.currentLineNumber, this.match.index + "value('".length,
                this.currentLineNumber, this.match.index + "value('".length + this.match[deAliasPosition].length,
            )));
            this.match = regexp.exec(line);
        }
    }

    /**
     * Finds all url parameters in the current line and adds them
     * to the corresponding array
     */
    private findUrlParams(): void {
        const line: string = this.getCurrentLine();
        this.urlParameters = [];
        const regexp: RegExp = /{(.+?)}/g;
        this.match = regexp.exec(line);
        while (this.match) {
            const cleared: string = this.match[1].replace(/[^a-z]/g, "");
            this.urlParameters.push(cleared);
            this.match = regexp.exec(line);
        }
    }

    /**
     * @returns current line
     */
    private getCurrentLine(): string {
        return this.getLine(this.currentLineNumber);
    }

    /**
     * @returns the keyword which is on the top of keywords stack
     */
    private getLastKeyword(): string | undefined {
        const stackHead: TextRange = this.keywordsStack[this.keywordsStack.length - 1];

        return (stackHead) ? stackHead.text : undefined;
    }

    /**
     * @param line line number
     * @returns undefined if line number is higher that number of lines, corresponding line otherwise
     */
    private getLine(line: number): string | undefined {
        return (line < this.lines.length) ? this.lines[line].toLowerCase() : undefined;
    }

    /**
     * Creates a diagnostic about unknown setting name or returns the setting
     * @param name the setting name
     * @returns undefined if setting is unknown, setting otherwise
     */
    private getSettingCheck(name: string): Setting | undefined {
        const setting: Setting = getSetting(name);
        if (!setting) {
            if (TextRange.KEYWORD_REGEXP.test(name)) {
                return undefined;
            }
            let dictionary: string[] = [];
            if (this.currentSection && this.currentSection.text === "placeholders") {
                dictionary = this.urlParameters;
                if (this.urlParameters && this.urlParameters.includes(name)) {
                    return undefined;
                }
            }
            dictionary = addDisplayNames(dictionary);
            const message: string = suggestionMessage(name, dictionary);
            this.result.push(createDiagnostic(
                Range.create(
                    this.currentLineNumber, this.match[1].length,
                    this.currentLineNumber, this.match[1].length + name.length,
                ),
                DiagnosticSeverity.Error, message,
            ));

            return undefined;
        }

        return setting;
    }

    /**
     * Calculates the number of columns in the found csv header
     */
    private handleCsv(): void {
        const line: string = this.getCurrentLine();
        let header: string;
        if (/=[ \t]*$/m.test(line)) {
            let j: number = this.currentLineNumber + 1;
            header = this.getLine(j);
            while (header && /^[ \t]*$/m.test(header)) {
                header = this.getLine(++j);
            }
        } else {
            header = line.substring(/=/.exec(line).index + 1);
        }
        this.match = /(^[ \t]*csv[ \t]+)(\w+)[ \t]*=/m.exec(line);
        this.addToStringMap(this.variables, "csvNames");
        this.csvColumns = countCsvColumns(header);
    }

    /**
     * Creates a diagnostic if `else` is found, but `if` is not
     * or `if` is not the last keyword
     */
    private handleElse(): void {
        this.setLastCondition();
        let message: string;
        if (!this.areWeIn("if")) {
            message = `${this.foundKeyword.text} has no matching if`;
        } else if (this.getLastKeyword() !== "if") {
            message =
                `${this.foundKeyword.text} has started before ${this.getLastKeyword()} has finished`;
        }
        if (message) {
            this.result.push(createDiagnostic(this.foundKeyword.range, DiagnosticSeverity.Error, message));
        }
    }

    /**
     * Removes the variable from the last `for`
     */
    private handleEndFor(): void {
        let forVariables: string[] = this.variables.get("forVariables");
        if (!forVariables) {
            forVariables = [];
        }
        forVariables.pop();
        this.variables.set("forVariables", forVariables);
    }

    /**
     * Creates diagnostics related to `for ... in _here_` statements
     * Like "for srv in servers", but "servers" is not defined
     * Also adds the new `for` variable to the corresponding map
     */
    private handleFor(): void {
        const line: string = this.getCurrentLine();
        this.match = /(^\s*for\s+)(\w+)\s+in/m.exec(line);
        if (this.match) {
            const matching: RegExpExecArray = this.match;
            this.match = /^([ \t]*for[ \t]+\w+[ \t]+in[ \t]+)(?:Object\.keys\((\w+)\)|(\w+)).*$/im.exec(line);
            if (this.match) {
                let position: number = Validator.CONTENT_POSITION;
                const range: Range = Range.create(
                    this.currentLineNumber, this.match[1].length,
                    this.currentLineNumber, this.match[1].length,
                );
                if (this.match[position]) {
                    range.start.character += "Object.keys(".length;
                    range.end.character += "Object.keys(".length;
                } else {
                    position++;
                }
                const variable: string = this.match[position];
                range.end.character += variable.length;
                if (!isInMap(variable, this.variables)) {
                    const message: string = suggestionMessage(variable, mapToArray(this.variables));
                    this.result.push(createDiagnostic(range, DiagnosticSeverity.Error, message));
                }
            } else {
                this.result.push(createDiagnostic(
                    Range.create(
                        Position.create(this.currentLineNumber, matching[0].length - "in".length),
                        Position.create(this.currentLineNumber, matching[0].length),
                    ),
                    DiagnosticSeverity.Error, "Empty 'in' statement",
                ));
            }
            this.match = matching;
            this.addToStringMap(this.variables, "forVariables");
        }
    }

    /**
     * Adds new variable to corresponding map,
     * Pushes a new keyword to the keyword stack
     * If necessary (`list hello = value1, value2` should not be closed)
     */
    private handleList(): void {
        const line: string = this.getCurrentLine();
        this.match = /(^\s*list\s+)(\w+)\s+=/.exec(line);
        this.addToStringMap(this.variables, "listNames");
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

    /**
     * Adds new keyword to the keywords stack if necessary
     * (`script = console.log("Hello World!")` should not be closed)
     */
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

    /**
     * Performs required operations
     * After a section has finished
     * Mostly empties arrays
     */
    private handleSection(): void {
        this.checkPreviousSection();
        this.addCurrentToParentSettings();
        if (!this.match) {
            if (this.previousSection) {
                this.currentSection = this.previousSection;
                this.currentSettings = this.previousSettings;
            }

            return;
        }
        if (/widget/i.test(this.match[Validator.CONTENT_POSITION])) {
            this.checkAliases();
            this.deAliases = [];
            this.aliases = [];
        }
        this.previousSettings = this.currentSettings;
        this.previousSection = this.currentSection;
        this.currentSettings = [];
        this.ifSettings.clear();
        this.currentSection = TextRange.create(this.match[Validator.CONTENT_POSITION], Range.create(
            this.currentLineNumber, this.match[1].length,
            this.currentLineNumber, this.match[1].length + this.match[Validator.CONTENT_POSITION].length,
        ));

        if (isInMap(this.currentSection.text, parentSections)) {
            this.parentSettings.set(this.currentSection.text, []);
        }
    }

    /**
     * Calls functions in proper order to handle a found setting
     */
    private handleSettings(): void {
        const line: string = this.getCurrentLine();
        if (!this.currentSection || !/(?:tag|key)s?/.test(this.currentSection.text)) {
            // We are not in tags or keys section
            const name: string = this.match[Validator.CONTENT_POSITION];
            const setting: Setting = this.getSettingCheck(name);
            if (!setting) {
                return;
            }

            if (setting.name === "table") {
                this.requiredSettings.push([getSetting("attribute")]);
            } else if (setting.name === "attribute") {
                this.requiredSettings.push([getSetting("table")]);
            }

            if (!setting.multiLine) {
                this.checkRepetition(setting);
            }

            this.typeCheck(setting);
            this.checkExcludes(setting);

            // Aliases
            if (setting.name === "alias") {
                this.match = /(^\s*alias\s*=\s*)(\S+)\s*$/m.exec(line);
                this.addToStringArray(this.aliases);
            }
            this.findDeAliases();
            if (setting.name === "urlparameters") {
                this.findUrlParams();
            }
        } else if (this.currentSection &&
            // We are in tags/keys section
            /(?:tag|key)s?/.test(this.currentSection.text) &&
            /(^[ \t]*)([a-z].*[a-z])[ \t]*=/.test(line)) {
            this.match = /(^[ \t]*)([a-z].*[a-z])[ \t]*=/.exec(line);
            const setting: Setting = getSetting(this.match[Validator.CONTENT_POSITION]);
            if (setting) {
                this.result.push(createDiagnostic(
                    Range.create(
                        this.currentLineNumber, this.match[1].length,
                        this.currentLineNumber, this.match[1].length + this.match[Validator.CONTENT_POSITION].length,
                    ),
                    DiagnosticSeverity.Information, `${this.match[Validator.CONTENT_POSITION]} is interpreted as a` +
                    " series tag and is sent to the server. Remove the setting from the [tags] section or enclose it" +
                    " double-quotes to suppress the warning.",
                ));
            }
        }
    }

    /**
     * Updates the lastCondition field
     */
    private setLastCondition(): void {
        this.lastCondition = this.currentLineNumber + this.getCurrentLine();
    }

    /**
     * Checks spelling mistakes in a section name
     */
    private spellingCheck(): void {
        const indent: number = this.match[1].length;
        const word: string = this.match[Validator.CONTENT_POSITION];
        const dictionary: string[] = possibleSections;
        if (!dictionary.includes(word)) {
            this.result.push(createDiagnostic(
                Range.create(
                    Position.create(this.currentLineNumber, indent),
                    Position.create(this.currentLineNumber, indent + word.length),
                ),
                DiagnosticSeverity.Error, suggestionMessage(word, dictionary),
            ));
        }
    }

    /**
     * Calls corresponding functions for the found keyword
     */
    private switchKeyword(): void {
        const line: string = this.getCurrentLine();
        switch (this.foundKeyword.text) {
            case "endfor": this.handleEndFor();
            case "endif":
            case "endvar":
            case "endcsv":
            case "endlist":
            case "endscript": {
                const expectedEnd: string = this.foundKeyword.text.substring("end".length);
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
                this.addToStringMap(this.variables, "varNames");
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
            case "import": break;
            default: throw new Error(`${this.foundKeyword.text} is not handled`);
        }
    }

    /**
     * Performs type checks for the found setting value
     * @param setting the setting to be checked
     */
    private typeCheck(setting: Setting): void {
        const valuePosition: number = 3;
        const settingValue: string = this.match[valuePosition];
        switch (setting.type) {
            // tslint:disable-next-line:no-null-keyword
            case null:
            case undefined: return;
            case "string": {
                if (this.match[valuePosition].length !== 0) {
                    return;
                }
                break;
            }
            case "number": {
                if (numberRegExp.test(settingValue)) {
                    return;
                }
                break;
            }
            case "integer": {
                if (integerRegExp.test(settingValue)) {
                    return;
                }
                break;
            }
            case "boolean": {
                if (booleanRegExp.test(settingValue)) {
                    return;
                }
                break;
            }
            case "enum": {
                const index: number = setting.enum.findIndex((option: string): boolean =>
                    new RegExp(`^${option}$`, "i").test(settingValue),
                );
                if (index >= 0) {
                    return;
                }

                break;
            }
            case "interval": {
                if (intervalRegExp.test(settingValue)) {
                    return;
                }
                break;
            }
            case "date": {
                if (isDate(settingValue)) {
                    return;
                }
                break;
            }
            default: {
                throw new Error(`${setting.type} is not handled`);
            }
        }
        this.result.push(createDiagnostic(
            Range.create(
                this.currentLineNumber, this.match[1].length,
                this.currentLineNumber, this.match[1].length + this.match[Validator.CONTENT_POSITION].length,
            ),
            DiagnosticSeverity.Error, (setting.type === "enum") ?
                `${settingValue} must be one of ${setting.enum.join(", ")}` :
                `${this.match[Validator.CONTENT_POSITION]} type is ${setting.type}`,
        ));
    }

    /**
     * Creates diagnostics for a CSV line containing wrong columns number
     */
    private validateCsv(): void {
        const line: string = this.getCurrentLine();
        const columns: number = countCsvColumns(line);
        if (columns !== this.csvColumns && !/^[ \t]*$/m.test(line)) {
            this.result.push(createDiagnostic(
                Range.create(this.currentLineNumber, 0, this.currentLineNumber, line.length),
                DiagnosticSeverity.Error, `Expected ${this.csvColumns} columns, but found ${columns}`,
            ));
        }
    }

    /**
     * Creates diagnostics for unknown variables in `for` keyword
     * like `for srv in servers setting = @{server} endfor`
     * but `server` is undefined
     */
    private validateFor(): void {
        const line: string = this.getCurrentLine();
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
                        Range.create(
                            this.currentLineNumber, position,
                            this.currentLineNumber, position + variable.length,
                        ),
                        DiagnosticSeverity.Error, message,
                    ));
                }
                this.match = varRegexp.exec(substr);
            }
            this.match = atRegexp.exec(line);
        }
    }
}
