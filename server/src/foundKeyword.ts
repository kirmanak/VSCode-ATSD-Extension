import { Range } from "vscode-languageserver";

export class FoundKeyword {
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

    public static parse(line: string, i: number): FoundKeyword | undefined {
        const match: RegExpExecArray = FoundKeyword.regexp.exec(line);
        if (match === null) { return undefined; }
        const keywordStart: number = match[1].length;

        return {
            keyword: match[this.KEYWORD_POSITION],
            range: {
                end: { character: keywordStart + match[this.KEYWORD_POSITION].length, line: i },
                start: { character: keywordStart, line: i },
            },
        };
    }

    private static readonly KEYWORD_POSITION: number = 2;
    private static readonly regexp: RegExp =
        /^([ \t]*)(endvar|endcsv|endfor|elseif|endif|endscript|endlist|script|else|if|list|for|csv|var)\b/i;

    public readonly keyword: string;
    public readonly range: Range;

}
