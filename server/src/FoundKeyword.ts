import { Range } from "vscode-languageserver";

export default class FoundKeyword {
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

    public static isCloseAble(line: string): boolean {
        return /^[ \t]*(?:for|if|list|var|script|csv)\b/.test(line);
    }

    public static isClosing(line: string): boolean {
        return /^[ \t]*(?:end(?:for|if|list|var|script|csv)|elseif|else)\b/.test(line);
    }

    public static isIncreasingIndent(line: string): boolean {
        return /^[ \t]*(?:for|if|else|elseif|script|csv|var|list)\b/.test(line);
    }

    public static isNotCloseAble(line: string): boolean {
        return /^[ \t]*else(?:if)?\b/.test(line);
    }

    private static regexp =
        /^([ \t]*)(endvar|endcsv|endfor|elseif|endif|endscript|endlist|script|else|if|list|for|csv|var)\b/i;

    public keyword: string;
    public range: Range;

}
