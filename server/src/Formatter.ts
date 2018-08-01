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
    private openKeywordsIndent: string[] = [];

    constructor(document: TextDocument, formattingParams: DocumentFormattingParams) {
        if (!document || !formattingParams) { throw new Error("Invalid arguments"); }
        this.params = formattingParams;
        this.lines = Util.deleteComments(document.getText()).split("\n");
    }

    public lineByLine(): TextEdit[] {
        for (; this.currentLine < this.lines.length; this.currentLine++) {
            if (this.isSection()) {
                this.calculateIndent();
                this.checkIndent();
                this.increaseIndent();
            } else {
                if (FoundKeyword.isClosing(this.getCurrentLine())) {
                    const stackHead = this.openKeywordsIndent.pop();
                    if (stackHead !== undefined) {
                        this.currentIndent = stackHead;
                        if (FoundKeyword.isNotCloseAble(this.getCurrentLine())) {
                            this.openKeywordsIndent.push(stackHead);
                        }
                    }
                }
                this.checkIndent();
                if (FoundKeyword.isCloseAble(this.getCurrentLine())) {
                    this.openKeywordsIndent.push(this.currentIndent);
                }
                if (FoundKeyword.isIncreasingIndent(this.getCurrentLine())) {
                    this.increaseIndent();
                }
            }
        }
        return this.edits;
    }

    private calculateIndent() {
        this.decreaseIndent();
        this.previous = this.current;
        this.current = this.match[2];
        if (this.isNested()) {
            this.increaseIndent();
        } else if (!this.isSameLevel()) {
            this.decreaseIndent();
        }
    }

    private decreaseIndent() {
        let newLength = this.currentIndent.length;
        if (this.params.options.insertSpaces) {
            newLength -= this.params.options.tabSize;
        } else {
            newLength--;
        }
        this.currentIndent = this.currentIndent.substring(0, newLength);
    }

    private increaseIndent() {
        if (this.params.options.insertSpaces) {
            for (let i = 0; i < this.params.options.tabSize; i++) {
                this.currentIndent = this.currentIndent + " ";
            }
        } else {
            this.currentIndent = this.currentIndent + "\t";
        }
    }

    private checkIndent() {
        if (!this.isEmpty()) {
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
    }

    private isEmpty(): boolean {
        return /^\s*$/.test(this.getCurrentLine());
    }

    private isSection(): boolean {
        this.match = /(^\s*)\[([a-z]+)\]/.exec(this.getCurrentLine());
        return this.match !== null;
    }

    private getCurrentLine() {
        return this.lines[this.currentLine].toLowerCase();
    }

    private isNested(): boolean {
        return this.current === "widget" && this.previous === "group" ||
            this.current === "widget" && this.previous === "configuration" ||
            this.current === "node" && this.previous === "widget" ||
            this.current === "link" && this.previous === "widget" ||
            this.current === "series" && this.previous === "link" ||
            this.current === "series" && this.previous === "widget" ||
            this.current === "tags" && this.previous === "series";
    }

    private isSameLevel(): boolean {
        return this.current === this.previous ||
            this.current === "group" && this.previous === "configuration" ||
            this.current === "link" && this.previous === "node" ||
            this.current === "node" && this.previous === "link";
    }
}
