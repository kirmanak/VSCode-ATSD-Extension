import { TextDocument, TextEdit } from "vscode-languageserver";
import * as Shared from "./sharedFunctions";

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

export function megaFunction(document: TextDocument): TextEdit[] {
    const edits: TextEdit[] = [];
    const text = Shared.deleteComments(document.getText());
    const sectionDeclaration = /\[.+\]/g;
    const assignment = /[-_\d\w]+[ \t]*=[ \t]*[-_\t\d\w ,.("")]+/g;
    let match = sectionDeclaration.exec(text);

    while (match) {
        const line = match[0];
        const range = {
            end: document.positionAt(match.index + match[0].length),
            start: document.positionAt(match.index),
        };
        if (sectionDeclaration.test(line)) {
            if (text.charAt(match.index - 1) !== "\n") { // if there is something extra before section declaration
                edits.push({
                    newText: "\n" + line,
                    range,
                });
            }
            if (text.charAt(match.index + match[0].length + 1) !== "\n") {
                edits.push({
                    newText: line + "\n",
                    range,
                });
            }
        }
        match = sectionDeclaration.exec(text);
    }

    return edits;
}
