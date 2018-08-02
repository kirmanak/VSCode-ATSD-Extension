import { DocumentFormattingParams, TextDocument, TextEdit } from "vscode-languageserver/lib/main";
import FoundKeyword from "./FoundKeyword";
import Util from "./Util";

export default class Formatter {
    private edits: TextEdit[] = [];
    private lines: string[];
    private currentLine = 0;
    private currentIndent = "";
    private match: RegExpExecArray;
    private previous: string;
    private current: string;
    private params: DocumentFormattingParams;
    private keywordsLevels: string[] = [];

    constructor(document: TextDocument, formattingParams: DocumentFormattingParams) {
        if (!document || !formattingParams) { throw new Error("Invalid arguments"); }
        this.params = formattingParams;
        this.lines = Util.deleteComments(document.getText()).split("\n");
    }

    public lineByLine(): TextEdit[] {
        for (; this.currentLine < this.lines.length; this.currentLine++) {
            const line = this.getCurrentLine();
            if (this.isSection() || this.isEmpty()) {
                if (this.isSection()) {
                    this.calculateIndent();
                    this.checkIndent();
                    this.increaseIndent();
                }
                continue;
            }
            if (FoundKeyword.isClosing(line)) {
                const stackHead = this.keywordsLevels.pop();
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

    private shouldBeClosed() {
        const line = this.getCurrentLine();
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
                let j = this.currentLine + 1;
                while (j < this.lines.length) {
                    if (/\bscript\b/.test(line)) { break; }
                    if (/\bendscript\b/.test(line)) { return true; }
                    j++;
                }
                break;
            }
            default: console.log("Update switch-case in Formatter.shouldBeClosed()");
        }
        return false;
    }

    private calculateIndent() {
        this.previous = this.current;
        this.current = this.match[2];
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

    private decreaseIndent() {
        if (this.currentIndent.length === 0) { return; }
        let newLength = this.currentIndent.length;
        if (this.params.options.insertSpaces) {
            newLength -= this.params.options.tabSize;
        } else {
            newLength--;
        }
        this.currentIndent = this.currentIndent.substring(0, newLength);
    }

    private increaseIndent() {
        this.currentIndent += (this.params.options.insertSpaces) ?
            Array(this.params.options.tabSize).fill(" ").join("") : "\t";
    }

    private setIndent(newIndent: string) {
        this.currentIndent = newIndent;
    }

    private checkIndent() {
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

    private isEmpty(): boolean {
        return /^\s*$/.test(this.getCurrentLine());
    }

    private isSection(): boolean {
        this.match = /(^\s*)\[([a-z]+)\]/.exec(this.getCurrentLine());
        return this.match !== null;
    }

    private getCurrentLine() {
        return this.getLine(this.currentLine);
    }

    private getLine(i: number) {
        return this.lines[i].toLowerCase();
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
}
