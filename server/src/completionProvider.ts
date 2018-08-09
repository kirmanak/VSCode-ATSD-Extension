import {
    CompletionItem, CompletionItemKind, InsertTextFormat, Position, TextDocument,
} from "vscode-languageserver";
import { possibleOptions } from "./resources";
import { deleteComments, deleteScripts } from "./util";

export class CompletionProvider {
    private readonly text: string;

    public constructor(textDocument: TextDocument, position: Position) {
        const text: string = textDocument.getText()
            .substr(0, textDocument.offsetAt(position));
        this.text = deleteScripts(deleteComments(text));
    }

    public getCompletionItems(): CompletionItem[] {
        return this.completeSettings()
            .concat([this.completeFor()]);
    }

    private completeFor(): CompletionItem {
        const regexp: RegExp = /^[ \t]*(?:list|var)[ \t]+(\S+)[ \t]*=/mg;
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
            detail: "For Loop",
            insertText: `\nfor \${1:${item}} in \${2:${collection}}\n  \${0}\nendfor`,
            insertTextFormat: InsertTextFormat.Snippet,
            kind: CompletionItemKind.Keyword,
            label: "for",
        };
    }

    private readonly completeSettings: () => CompletionItem[] = (): CompletionItem[] =>
        possibleOptions.map((setting: string): CompletionItem => ({
            insertText: `${setting} = \${0}`,
            insertTextFormat: InsertTextFormat.Snippet,
            kind: CompletionItemKind.Constant,
            label: setting,
        }))
}
