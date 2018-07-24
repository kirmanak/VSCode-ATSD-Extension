import * as Levenshtein from "levenshtein";
import * as Shared from "./sharedFunctions";

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
        if (!word || ! dictionary) { return null; }
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
        return Shared.errorMessage(word, suggestion);
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
}
