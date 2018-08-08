import {
    CompletionItem, CompletionItemKind, CompletionList, InsertTextFormat, Position, TextDocument,
} from "vscode-languageserver";
import { deleteComments } from "./util";

export class CompletionProvider {
    private text: string;

    public constructor(textDocument: TextDocument, position: Position) {
        const text: string = textDocument.getText()
            .substr(0, textDocument.offsetAt(position));
        this.text = deleteComments(text);
    }

    public getCompletionList(): CompletionList {
        const result: CompletionList = {
            isIncomplete: true,
            items: [],
        };
        const regexp: RegExp = /^(?:list|var)\s+(\S+)\s*=\s*\S+/mg;
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

        const completion: CompletionItem = {
            insertText: `\nfor \${1:${item}} in \${2:${collection}}\n  \${0}\nendfor`,
            insertTextFormat: InsertTextFormat.Snippet,
            kind: CompletionItemKind.Keyword,
            label: "For loop",
        };
        result.items.push(completion);

        return result;
    }
}
