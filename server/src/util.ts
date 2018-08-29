import * as Levenshtein from "levenshtein";
import { Diagnostic, DiagnosticSeverity, Range } from "vscode-languageserver";
import { calendarRegExp, localDateRegExp, settings, zonedDateRegExp } from "./resources";
import { Setting } from "./setting";

const DIAGNOSTIC_SOURCE: string = "Axibase Charts";

export const isInMap: <T>(value: T, map: Map<string, T[]> | Map<string, T[][]>) => boolean =
    <T>(value: T, map: Map<string, T[]> | Map<string, T[][]>): boolean => {
        if (!value || !map) {
            return false;
        }
        for (const array of map.values()) {
            for (const item of array) {
                if (Array.isArray(item)) {
                    if (item.includes(value)) {
                        return true;
                    }
                } else {
                    if (item === value) {
                        return true;
                    }
                }
            }
        }

        return false;
    };

export const isAnyInArray: <T>(target: T[], array: T[]) => boolean = <T>(target: T[], array: T[]): boolean => {
    if (!array) {
        return false;
    }
    for (const item of target) {
        if (array.includes(item)) {
            return true;
        }
    }

    return false;
};

export const mapToArray: (map: Map<string, string[]>) => string[] =
    (map: Map<string, string[]>): string[] => {
        const array: string[] = [];
        if (!map) {
            return array;
        }
        map.forEach((arr: string[]) => arr.forEach((item: string) => array.push(item)));

        return array;
    };

export const suggestionMessage: (word: string, dictionary: string[]) => string =
    (word: string, dictionary: string[]): string => {
        if (!word || !dictionary) {
            return undefined;
        }
        let suggestion: string;
        let min: number = Number.MAX_VALUE;
        dictionary.filter((value: string): boolean => value !== undefined && value !== null)
            .forEach((value: string) => {
                const distance: number = new Levenshtein(value, word).distance;
                if (distance < min) {
                    min = distance;
                    suggestion = value;
                }
            });

        return errorMessage(word, suggestion);
    };

export const getSetting: (name: string) => Setting | undefined = (name: string): Setting | undefined => {
    const clearedName: string = name.toLowerCase()
        .replace(/[^a-z]/g, "");

    return settings.find((setting: Setting): boolean => setting.name === clearedName);
};

export const countCsvColumns: (line: string) => number = (line: string): number => {
    const regex: RegExp = /(['"]).+\1|[^, \t]+/g;
    let counter: number = 0;
    while (regex.exec(line)) {
        counter++;
    }

    return counter;
};

export const createDiagnostic: (range: Range, severity: DiagnosticSeverity, message: string) => Diagnostic =
    (range: Range, severity: DiagnosticSeverity, message: string): Diagnostic =>
        Diagnostic.create(range, message, severity, undefined, DIAGNOSTIC_SOURCE);

export const deleteComments: (text: string) => string = (text: string): string => {
    let content: string = text;
    const multiLine: RegExp = /\/\*[\s\S]*?\*\//g;
    const oneLine: RegExp = /^[ \t]*#.*/mg;
    let match: RegExpExecArray = multiLine.exec(content);
    if (!match) {
        match = oneLine.exec(content);
    }

    while (match) {
        const newLines: number = match[0].split("\n").length - 1;
        const spaces: string = Array(match[0].length)
            .fill(" ")
            .concat(
                Array(newLines)
                    .fill("\n"),
            )
            .join("");
        content = `${content.substr(0, match.index)}${spaces}${content.substr(match.index + match[0].length)}`;
        match = multiLine.exec(content);
        if (!match) {
            match = oneLine.exec(content);
        }
    }

    return content;
};

export const errorMessage: (found: string, suggestion: string) => string =
    (found: string, suggestion: string): string =>
        (suggestion === undefined) ? `${found} is unknown.` : `${found} is unknown. Suggestion: ${suggestion}`;

export const deleteScripts: (text: string) => string = (text: string): string =>
    text.replace(/\bscript\b([\s\S]+?)\bendscript\b/g, "script\nendscript");

export const isDate: (text: string) => boolean = (text: string): boolean =>
    calendarRegExp.test(text) || localDateRegExp.test(text) || zonedDateRegExp.test(text);
