import {
    CompletionItem, CompletionItemKind, CompletionList, InsertTextFormat, Position, TextDocument, TextEdit,
} from "vscode-languageserver";
import { possibleOptions } from "./resources";
import { deleteComments } from "./util";

export class CompletionProvider {
    private readonly position: Position;
    private readonly text: string;

    public constructor(textDocument: TextDocument, position: Position) {
        const text: string = textDocument.getText()
            .substr(0, textDocument.offsetAt(position));
        this.text = deleteComments(text);
        this.position = position;
    }

    public getCompletionList(): CompletionList {
        const result: CompletionList = {
            isIncomplete: false,
            items: this.completeSettings(),
        };

        result.items.push(this.completeFor());

        return result;
    }

    private completeFor(): CompletionItem {
        const regexp: RegExp = /(?:list|var)[ \t]+(\S+)[ \t]*=/g;
        let match: RegExpExecArray = regexp.exec(this.text);
        let lastMatch: RegExpExecArray;

        while (match) {
            lastMatch = match;
            match = regexp.exec(this.text);
        }

        let collection: string = "collection";
        let item: string = "item";

        if (lastMatch) {
            collection = lastMatch[1];
            if (collection.endsWith("s")) {
                item = collection.substr(0, collection.lastIndexOf("s"));
            }
        }

        return {
            insertText: `\nfor \${1:${item}} in \${2:${collection}}\n  \${0}\nendfor`,
            insertTextFormat: InsertTextFormat.Snippet,
            kind: CompletionItemKind.Keyword,
            label: "For loop",
        };
    }

    private completeSettings(): CompletionItem[] {
        return possibleOptions.map((setting: string): CompletionItem => ({
            insertTextFormat: InsertTextFormat.Snippet,
            kind: CompletionItemKind.Constant,
            label: setting,
            textEdit: TextEdit.replace({ end: this.position, start: this.position }, `${setting} = \${0}`),
        }));
    }
}
