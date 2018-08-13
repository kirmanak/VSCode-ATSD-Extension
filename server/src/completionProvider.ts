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
            .concat(this.completeIf())
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
            insertText: `
for \${1:${item}} in \${2:${collection}}
  \${3:entity = @{\${1:${item}}}}
  \${0}
endfor`,
            insertTextFormat: InsertTextFormat.Snippet,
            kind: CompletionItemKind.Keyword,
            label: "for",
        };
    }

    private completeIf(): CompletionItem[] {
        const regexp: RegExp = /^[ \t]*for[ \t]+(\w+)[ \t]+in/img;
        const endFor: RegExp = /^[ \t]*endfor/img;
        let match: RegExpExecArray = regexp.exec(this.text);
        let lastMatch: RegExpExecArray;

        while (match) {
            const end: RegExpExecArray = endFor.exec(this.text);
            if (!end || end.index < match.index) {
                lastMatch = match;
            }
            match = regexp.exec(this.text);
        }

        let item: string = "item";

        if (lastMatch) {
            item = lastMatch[1];
        }

        return [
            {
                detail: "if item equals text",
                insertText: `
if @{\${1:${item}}} \${2:==} \${3:"item1"}
  \${4:entity} = \${5:"item2"}
else
  \${4:entity} = \${6:"item3"}
endif
\${0}`,
                label: "if text",
            },
            {
                detail: "if item equals number",
                insertText: `
if @{\${1:${item}}} \${2:==} \${3:5}
  \${4:entity} = \${5:"item1"}
else
  \${4:entity} = \${6:"item2"}
endif
\${0}`,
                label: "if number",
            },
            {
                detail: "if item equals number else if",
                insertText:
                    `
if @{\${1:${item}}} \${2:==} \${3:5}
  \${4:entity} = \${5:"item1"}
elseif @{\${1:${item}}} \${6:==} \${7:6}
  \${4:entity} = \${8:"item2"}
else
  \${4:entity} = \${9:"item3"}
endif
\${0}`,
                label: "if elseif",
            },
        ].map((completion: CompletionItem): CompletionItem => {
            completion.insertTextFormat = InsertTextFormat.Snippet;
            completion.kind = CompletionItemKind.Keyword;

            return completion;
        });
    }

    private readonly completeSettings: () => CompletionItem[] = (): CompletionItem[] =>
        possibleOptions.map((setting: string): CompletionItem => ({
            insertText: `${setting} = \${0}`,
            insertTextFormat: InsertTextFormat.Snippet,
            kind: CompletionItemKind.Constant,
            label: setting,
        }))
}
