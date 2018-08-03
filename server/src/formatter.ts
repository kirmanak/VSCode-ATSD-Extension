import { DocumentFormattingParams, TextDocument, TextEdit } from "vscode-languageserver";
import { FoundKeyword } from "./foundKeyword";
import { deleteComments } from "./util";

export class Formatter {
    private static readonly CONTENT_POSITION: number = 2;
    private current: string;
    private currentIndent: string = "";
    private currentLine: number = 0;
    private readonly edits: TextEdit[] = [];
    private readonly keywordsLevels: string[] = [];
    private lastLine: string;
    private lastLineNumber: number;
    private readonly lines: string[];
    private match: RegExpExecArray;
    private readonly params: DocumentFormattingParams;
    private previous: string;

    public constructor(document: TextDocument, formattingParams: DocumentFormattingParams) {
        if (!document || !formattingParams) { throw new Error("Invalid arguments"); }
        this.params = formattingParams;
        this.lines = deleteComments(document.getText())
            .split("\n");
    }

    public lineByLine(): TextEdit[] {
        for (; this.currentLine < this.lines.length; this.currentLine++) {
            const line: string = this.getCurrentLine();
            if (this.isSection() || this.isEmpty()) {
                if (this.isSection()) {
                    this.calculateIndent();
                    this.checkIndent();
                    this.increaseIndent();
                }
                continue;
            }
            if (FoundKeyword.isClosing(line)) {
                const stackHead: string = this.keywordsLevels.pop();
                if (stackHead !== undefined) {
                    this.setIndent(stackHead);
                    if (FoundKeyword.isNotCloseAble(line)) { this.keywordsLevels.push(stackHead); }
                }
            }
            this.checkIndent();
            if (this.shouldBeClosed()) {
                if (FoundKeyword.isCloseAble(line)) {
                    this.current = undefined;
                    this.keywordsLevels.push(this.currentIndent);
                }
                if (FoundKeyword.isIncreasingIndent(line)) { this.increaseIndent(); }
            }
        }

        return this.edits;
    }

    private calculateIndent(): void {
        this.previous = this.current;
        this.current = this.match[Formatter.CONTENT_POSITION];
        if (/\[(?:group|configuration)\]/i.test(this.getCurrentLine())) {
            this.setIndent("");

            return;
        }
        this.decreaseIndent();
        if (this.isNested()) {
            this.increaseIndent();
        } else if (!this.isSameLevel()) {
            this.decreaseIndent();
        }
    }

    private checkIndent(): void {
        this.match = /(^\s*)\S/.exec(this.getCurrentLine());
        if (this.match[1] !== this.currentIndent) {
            this.edits.push({
                newText: this.currentIndent,
                range: {
                    end: { character: (this.match[1]) ? this.match[1].length : 0, line: this.currentLine },
                    start: { character: 0, line: this.currentLine },
                },
            });
        }
    }

    private decreaseIndent(): void {
        if (this.currentIndent.length === 0) { return; }
        let newLength: number = this.currentIndent.length;
        if (this.params.options.insertSpaces) {
            newLength -= this.params.options.tabSize;
        } else {
            newLength--;
        }
        this.currentIndent = this.currentIndent.substring(0, newLength);
    }

    private getCurrentLine(): string {
        return this.getLine(this.currentLine);
    }

    private getLine(i: number): string {
        if (this.lastLineNumber !== i) {
            const line: string = this.lines[i].toLowerCase();
            this.removeExtraSpaces(line);
            this.lastLine = line;
            this.lastLineNumber = i;
        }

        return this.lastLine;
    }

    private increaseIndent(): void {
        let addition: string = "\t";
        if (this.params.options.insertSpaces) {
            addition = Array(this.params.options.tabSize)
                .fill(" ")
                .join("");
        }
        this.currentIndent += addition;
    }

    private isEmpty(): boolean {
        return /^\s*$/.test(this.getCurrentLine());
    }

    private isNested(): boolean {
        return this.previous && ((this.current === "widget" && this.previous === "group") ||
            (this.current === "widget" && this.previous === "configuration") ||
            (this.current === "node" && this.previous === "widget") ||
            (this.current === "link" && this.previous === "widget") ||
            (this.current === "series" && this.previous === "link") ||
            (this.current === "series" && this.previous === "widget") ||
            (this.current === "tags" && this.previous === "series"));
    }

    private isSameLevel(): boolean {
        return (this.previous === undefined) || (this.current === this.previous) ||
            (this.current === "group" && this.previous === "configuration") ||
            (this.current === "link" && this.previous === "node") ||
            (this.current === "node" && this.previous === "link");
    }

    private isSection(): boolean {
        this.match = /(^\s*)\[([a-z]+)\]/.exec(this.getCurrentLine());

        return this.match !== null;
    }

    private removeExtraSpaces(line: string): void {
        const match: RegExpExecArray = /(\s+)$/.exec(line);
        if (match) {
            this.edits.push({
                newText: "",
                range: {
                    end: { character: line.length, line: this.currentLine },
                    start: { character: line.length - match[1].length, line: this.currentLine },
                },
            });
        }
    }

    private setIndent(newIndent: string): void {
        this.currentIndent = newIndent;
    }

    private shouldBeClosed(): boolean {
        const line: string = this.getCurrentLine();
        this.match = /^[ \t]*((?:var|list)|script =)/.exec(line);
        if (!this.match) { return true; }
        switch (this.match[1]) {
            case "var": {
                if (/=\s*(\[|\{)(|.*,)\s*$/m.test(line)) { return true; }
                break;
            }
            case "list": {
                if (/(=|,)[ \t]*$/m.test(line)) { return true; }
                break;
            }
            case "script =": {
                let j: number = this.currentLine + 1;
                while (j < this.lines.length) {
                    if (/\bscript\b/.test(line)) { break; }
                    if (/\bendscript\b/.test(line)) { return true; }
                    j++;
                }
                break;
            }
            default: { return true; }
        }

        return false;
    }
}
