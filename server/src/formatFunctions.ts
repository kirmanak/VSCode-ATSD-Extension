import { TextDocument, TextEdit } from "vscode-languageserver";
import * as Shared from "./sharedFunctions";

const INDENT_SIZE = 2;

export function extraTextSectionLine(document: TextDocument): TextEdit[] {
    const edits: TextEdit[] = [];
    const text = Shared.deleteComments(document.getText());
    const target = /(?:(.*?[^ \t\n].*?)\[.*?\](.*))|(?:(.*?)\[.*\](.*?[^ \t\n].*))/g; // incorrect formatting
    const purpose = /\[.*\]/; // correct formatting
    const nonWhiteSpace = /\s*\S+\s*/;
    let matching: RegExpExecArray = target.exec(text);

    while (matching) {
        const incorrectLine = matching[0];
        const substr = purpose.exec(incorrectLine)[0];
        const before = (matching[1] === undefined) ? matching[3] : matching[1];
        const after = (matching[2] === undefined) ? matching[4] : matching[2];
        let newText = (nonWhiteSpace.test(before)) ? before + "\n\n" + substr : substr;
        if (nonWhiteSpace.test(after)) { newText += "\n\t" + after; }
        const edit: TextEdit = {
            newText,
            range: {
                end: document.positionAt(matching.index + incorrectLine.length),
                start: document.positionAt(matching.index),
            },
        };
        edits.push(edit);
        matching = target.exec(text);
    }

    return edits;
}

export function severalStatementsPerLine(document: TextDocument): TextEdit[] {
    const edits: TextEdit[] = [];
    const text = Shared.deleteComments(document.getText());
    const target = /(?:[ \t]*?[-_\w\d]+?[ \t]*?=[ \t]*?[- ()"".,_\w\d]+[ \t]*?){2,}/g;
    const purpose = /[-_\w\d]+?[ \t]*?=[ \t]*?[-_\w\d]+/g;

    let incorrectLine = target.exec(text);

    while (incorrectLine) {
        let newText: string = "";
        let matching = purpose.exec(incorrectLine[0]);
        while (matching) {
            newText = newText + matching[0] + "\n";
            matching = purpose.exec(incorrectLine[0]);
        }
        edits.push({
            newText,
            range: {
                end: document.positionAt(incorrectLine.index + incorrectLine[0].length),
                start: document.positionAt(incorrectLine.index),
            },
        });
        incorrectLine = target.exec(text);
    }

    return edits;
}

function isNested(current: string, previous: string): boolean {
    return current === "widget" && previous === "group" ||
        current === "widget" && previous === "configuration" ||
        current === "node" && previous === "widget" ||
        current === "link" && previous === "widget" ||
        current === "series" && previous === "link" ||
        current === "tags" && previous === "series";
}

function isSameLevel(current: string, previous: string): boolean {
    return current === previous ||
        current === "group" && previous === "configuration" ||
        current === "link" && previous === "node" ||
        current === "node" && previous === "link";
}

export function megaFunction(document: TextDocument): TextEdit[] {
    const edits: TextEdit[] = [];
    const text = Shared.deleteComments(document.getText());
    const sectionDeclaration = /([ \t]*)\[(\w+)\]([\s\S]+?)(?=\s*\[|$)/g;
    let indentCounter: number = INDENT_SIZE;
    const previousSection: string[] = [];
    let section: RegExpExecArray = sectionDeclaration.exec(text);

    while (section) {
        const indent = section[1];
        const sectionName = section[2];
        // const content = section[3];
        if (isNested(sectionName, previousSection[previousSection.length - 1])) {
            indentCounter += INDENT_SIZE;
        } else if (!isSameLevel(sectionName, previousSection[previousSection.length - 1])) {
            indentCounter -= INDENT_SIZE;
            previousSection.pop();
        } else {
            previousSection.pop();
        }
        if (indent.length !== indentCounter) {
            console.log(`section is "${sectionName}", previous is "${previousSection[previousSection.length - 1]}",\n` +
                `indent length is ${indent.length}, expected ${indentCounter}`);
        }
        previousSection.push(sectionName);
        section = sectionDeclaration.exec(text);
    }

    return edits;
}
