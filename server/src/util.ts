import * as Levenshtein from "levenshtein";
import { Diagnostic, DiagnosticSeverity, Range } from "vscode-languageserver";

const DIAGNOSTIC_SOURCE: string = "Axibase Charts";

export const isInMap: (value: string, map: Map<string, string[]> | Map<string, string[][]>) => boolean =
    (value: string, map: Map<string, string[]> | Map<string, string[][]>): boolean => {
        if (!value || !map) { return false; }
        for (const array of map.values()) {
            for (const item of array) {
                if (typeof item === "string") {
                    if (item === value) { return true; }
                } else {
                    for (const word of item) {
                        if (word === value) { return true; }
                    }
                }
            }
        }

        return false;
    };

export const mapToArray: (map: Map<string, string[]>) => string[] =
    (map: Map<string, string[]>): string[] => {
        const array: string[] = [];
        if (!map) { return array; }
        map.forEach((arr: string[]) => arr.forEach((item: string) => array.push(item)));

        return array;
    };

export const suggestionMessage: (word: string, dictionary: string[]) => string =
    (word: string, dictionary: string[]): string => {
        if (!word || !dictionary) { return undefined; }
        let suggestion: string;
        let min: number = Number.MAX_VALUE;
        dictionary.forEach((value: string) => {
            if (value === undefined) { return; }
            const distance: number = new Levenshtein(value, word).distance;
            if (distance < min) {
                min = distance;
                suggestion = value;
            }
        });

        return errorMessage(word, suggestion);
    };

export const isAnyInArray: (toCheck: string[], array: string[]) => boolean =
    (toCheck: string[], array: string[]): boolean =>
        !toCheck || (toCheck.find((item: string) => this.isInArray(array, item)) !== undefined);

export const isInArray: (array: string[], value: string) => boolean =
    (array: string[], value: string): boolean =>
        array && array.find((item: string) => value === item) !== undefined;

export const countCsvColumns: (line: string) => number = (line: string): number => {
    const regex: RegExp = /(['"]).+\1|[^, \t]+/g;
    let counter: number = 0;
    while (regex.exec(line)) { counter++; }

    return counter;
};

export const createDiagnostic: (range: Range, severity: DiagnosticSeverity, message: string) => Diagnostic =
    (range: Range, severity: DiagnosticSeverity, message: string): Diagnostic =>
        Diagnostic.create(range, message, severity, undefined, DIAGNOSTIC_SOURCE);

export const deleteComments: (text: string) => string = (text: string): string => {
    let content: string = text;
    const multiLine: RegExp = /\/\*[\s\S]*?\*\//g;
    const oneLine: RegExp = /^[ \t]*#.*/mg;
    let i: RegExpExecArray = multiLine.exec(content);
    if (!i) { i = oneLine.exec(content); }

    while (i) {
        let spaces: string = " ";
        for (let j: number = 1; j < i[0].length; j++) { spaces += " "; }
        const newLines: number = i[0].split("\n").length - 1;
        for (let j: number = 0; j < newLines; j++) { spaces += "\n"; }
        content = content.substring(0, i.index) + spaces +
            content.substring(i.index + i[0].length);
        i = multiLine.exec(content);
        if (!i) { i = oneLine.exec(content); }
    }

    return content;
};

export const errorMessage: (found: string, suggestion: string) => string =
    (found: string, suggestion: string): string =>
        (suggestion === undefined) ? `${found} is unknown.` : `${found} is unknown. Suggestion: ${suggestion}`;

export const deleteScripts: (text: string) => string = (text: string): string => {
    const multiLine: RegExp = /\bscript\b([\s\S]+?)\bendscript\b/g;

    return text.replace(multiLine, "script\nendscript");
};
