import { Position, Range } from "vscode-languageserver";

export class TextRange {
    public static readonly KEYWORD_REGEXP: RegExp =
        /^([ \t]*)(import|endvar|endcsv|endfor|elseif|endif|endscript|endlist|script|else|if|list|for|csv|var)\b/i;
    public static create(text: string, range: Range): TextRange {
        return { range, text };
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

    public static parse(line: string, i: number): TextRange | undefined {
        const match: RegExpExecArray = TextRange.KEYWORD_REGEXP.exec(line);
        if (match === null) {
            return undefined;
        }
        const keywordStart: number = match[1].length;

        return TextRange.create(match[this.KEYWORD_POSITION], Range.create(
            Position.create(i, keywordStart), Position.create(i, keywordStart + match[this.KEYWORD_POSITION].length),
        ));
    }

    private static readonly KEYWORD_POSITION: number = 2;

    public readonly range: Range;
    public readonly text: string;

}
