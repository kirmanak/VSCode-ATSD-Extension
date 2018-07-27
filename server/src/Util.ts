import * as Levenshtein from "levenshtein";
import { Diagnostic, DiagnosticSeverity, Location } from "vscode-languageserver/lib/main";

export default class Util {
    public static isInMap(value: string, map: Map<string, string[]>): boolean {
        if (!value || !map) { return false; }
        for (const array of map.values()) {
            for (const item of array) {
                if (item === value) { return true; }
            }
        }
        return false;
    }

    public static MapToArray(map: Map<string, string[]>): string[] {
        const array: string[] = [];
        if (!map) { return array; }
        map.forEach((arr) => arr.forEach((item) => array.push(item)));
        return array;
    }

    public static suggestionMessage(word: string, dictionary: string[]): string {
        if (!word || !dictionary) { return null; }
        let suggestion = null;
        let min = Number.MAX_VALUE;
        dictionary.forEach((value) => {
            if (value === undefined) { return; }
            const distance = new Levenshtein(value, word).distance;
            if (distance < min) {
                min = distance;
                suggestion = value;
            }
        });
        return Util.errorMessage(word, suggestion);
    }

    public static isAnyInArray(toCheck: string[], array: string[]): boolean {
        return !toCheck || (toCheck.find((item) => this.isInArray(array, item)) !== undefined);
    }

    public static isInArray(array: string[], value: string): boolean {
        return array && array.find((item) => value === item) !== undefined;
    }

    public static countCsvColumns(line: string): number {
        const regex = /(['"]).+\1|[^, \t]+/g;
        let counter = 0;
        while (regex.exec(line)) { counter++; }
        return counter;
    }

    public static createDiagnostic(location: Location, severity: DiagnosticSeverity, message: string): Diagnostic {
        const diagnostic: Diagnostic = {
            message, range: location.range,
            severity, source: Util.DIAGNOSTIC_SOURCE,
        };
        return diagnostic;
    }

    public static deleteComments(text: string): string {
        const multiLine = /\/\*[\s\S]*?\*\//g;
        const oneLine = /^[ \t]*#.*/mg;
        let i: RegExpExecArray = multiLine.exec(text);
        if (!i) { i = oneLine.exec(text); }

        while (i) {
            let spaces = " ";
            for (let j = 1, len = i[0].length; j < len; j++) { spaces += " "; }
            const newLines = i[0].split("\n").length - 1;
            for (let j = 0; j < newLines; j++) { spaces += "\n"; }
            text = text.substring(0, i.index) + spaces +
                text.substring(i.index + i[0].length);
            i = multiLine.exec(text);
            if (!i) { i = oneLine.exec(text); }
        }

        return text;
    }

    public static errorMessage(found: string, suggestion: string): string {
        return (suggestion === null) ? `${found} is unknown.` : `${found} is unknown. Suggestion: ${suggestion}`;
    }

    private static DIAGNOSTIC_SOURCE = "Axibase Charts";
}
