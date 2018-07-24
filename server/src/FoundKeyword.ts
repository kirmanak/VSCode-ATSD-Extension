import { Range } from "vscode-languageserver";

export class FoundKeyword {
    public static parse(line: string, i: number): FoundKeyword | null {
        const match = FoundKeyword.regexp.exec(line);
        if (match === null) { return null; }
        const keywordStart = match[1].length;
        return {
            keyword: match[2],
            range: {
                end: { character: keywordStart + match[2].length, line: i },
                start: { character: keywordStart, line: i },
            },
        };
    }

    private static regexp =
    /^([ \t]*)(endvar|endcsv|endfor|elseif|endif|endscript|endlist|script|else|if|list|for|csv|var)\b/i;

    public keyword: string;
    public range: Range;
}
