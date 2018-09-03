import { FormattingOptions, Range, TextEdit } from "vscode-languageserver";
import { getParents } from "./resources";
import { TextRange } from "./textRange";

export class Formatter {
    private static readonly CONTENT_POSITION: number = 2;
    private current: string | undefined;
    private currentIndent: string = "";
    private currentLine: number = 0;
    private readonly edits: TextEdit[] = [];
    private readonly keywordsLevels: string[] = [];
    private lastLine: string | undefined;
    private lastLineNumber: number | undefined;
    private readonly lines: string[];
    private match: RegExpExecArray | null | undefined;
    private readonly options: FormattingOptions;
    private previous: string | undefined;

    public constructor(text: string, formattingOptions: FormattingOptions) {
        this.options = formattingOptions;
        this.lines = text.split("\n");
    }

    /**
     * Reads the document line by line and calls corresponding formatting functions
     * @returns array of text edits to properly format document
     */
    public lineByLine(): TextEdit[] {
        for (const line of this.lines) {
            if (this.isSection() || this.isEmpty()) {
                if (this.isSection()) {
                    this.calculateIndent();
                    this.checkIndent();
                    this.increaseIndent();
                }

                continue;
            }
            if (TextRange.isClosing(line)) {
                const stackHead: string | undefined = this.keywordsLevels.pop();
                if (stackHead !== undefined) {
                    this.setIndent(stackHead);
                    if (TextRange.isNotCloseAble(line)) {
                        this.keywordsLevels.push(stackHead);
                    }
                }
            }
            this.checkIndent();
            if (this.shouldBeClosed()) {
                if (TextRange.isCloseAble(line)) {
                    this.current = undefined;
                    this.keywordsLevels.push(this.currentIndent);
                }
                if (TextRange.isIncreasingIndent(line)) {
                    this.increaseIndent();
                }
            }
            this.currentLine++;
        }

        return this.edits;
    }

    /**
     * Calculates current indent based on current state
     */
    private calculateIndent(): void {
        if (!this.match) {
            throw new Error("this.match or/and this.current is not defined in calculateIndent");
        }
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

    /**
     * Creates a text edit if the current indent is incorrect
     */
    private checkIndent(): void {
        this.match = /(^\s*)\S/.exec(this.getCurrentLine());
        if (this.match && this.match[1] !== this.currentIndent) {
            this.edits.push(TextEdit.replace(
                Range.create(this.currentLine, 0, this.currentLine, (this.match[1]) ? this.match[1].length : 0),
                this.currentIndent,
            ));
        }
    }

    /**
     * Decreases the current indent by one
     */
    private decreaseIndent(): void {
        if (this.currentIndent.length === 0) { return; }
        let newLength: number = this.currentIndent.length;
        if (this.options.insertSpaces) {
            newLength -= this.options.tabSize;
        } else {
            newLength--;
        }
        this.currentIndent = this.currentIndent.substring(0, newLength);
    }

    /**
     * @returns current line
     */
    private getCurrentLine(): string {
        const line: string | undefined = this.getLine(this.currentLine);
        if (line === undefined) {
            throw new Error("this.currentLine points to nowhere");
        }

        return line;
    }

    /**
     * Caches last returned line in this.lastLineNumber
     * To prevent several calls toLowerCase and removeExtraSpaces
     * @param i the required line number
     * @returns the required line
     */
    private getLine(i: number): string | undefined {
        if (!this.lastLine || this.lastLineNumber !== i) {
            let line: string | undefined = this.lines[i];
            if (line === undefined) {
                return undefined;
            }
            line = line.toLowerCase();
            this.removeExtraSpaces(line);
            this.lastLine = line;
            this.lastLineNumber = i;
        }

        return this.lastLine;
    }

    /**
     * Increases current indent by one
     */
    private increaseIndent(): void {
        let addition: string = "\t";
        if (this.options.insertSpaces) {
            addition = Array(this.options.tabSize)
                .fill(" ")
                .join("");
        }
        this.currentIndent += addition;
    }

    /**
     * @returns true if the current line contains white spaces or nothing, false otherwise
     */
    private isEmpty(): boolean {
        return /^\s*$/.test(this.getCurrentLine());
    }

    /**
     * @returns true if the current section is nested in the previous section
     */
    private isNested(): boolean {
        if (this.current === undefined) {
            throw new Error("Current or previous section is not defined, but we're trying to check nested");
        }
        if (this.previous === undefined) {
            this.previous = "";
        }

        return getParents(this.current)
            .includes(this.previous);
    }

    /**
     * @returns true if current and previous section must be placed on the same indent level
     */
    private isSameLevel(): boolean {
        return (this.previous === undefined) || (this.current === this.previous) ||
            (this.current === "group" && this.previous === "configuration") ||
            (this.current === "link" && this.previous === "node") ||
            (this.current === "series" && this.previous === "link") ||
            (this.current === "link" && this.previous === "series") ||
            (this.current === "node" && this.previous === "link");
    }

    /**
     * @returns true, if current line is section declaration
     */
    private isSection(): boolean {
        this.match = /(^\s*)\[([a-z]+)\]/.exec(this.getCurrentLine());

        return this.match !== null;
    }

    /**
     * Removes trailing spaces (at the end and at the beginning)
     * @param line the target line
     */
    private removeExtraSpaces(line: string): void {
        const match: RegExpExecArray | null = /(\s+)$/.exec(line);
        if (match) {
            this.edits.push(TextEdit.replace(
                Range.create(this.currentLine, line.length - match[1].length, this.currentLine, line.length), "",
            ));
        }
    }

    /**
     * Sets current indent to the provided
     * @param newIndent the new indent
     */
    private setIndent(newIndent: string): void {
        this.currentIndent = newIndent;
    }

    /**
     * @returns true if current keyword should be closed
     */
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
