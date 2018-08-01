import { Diagnostic as tsDiagnostic } from "typescript";
import * as ts from "typescript";
import { Diagnostic as vsDiagnostic, DiagnosticSeverity, Range, TextDocument } from "vscode-languageserver/lib/main";
import Statement from "./Statement";
import Util from "./Util";

export default class JsDomCaller {
    private match: RegExpExecArray;
    private uri: string;
    private currentLineNumber: number = 0;
    private lines: string[];
    private statements: Statement[] = [];


    constructor(document: TextDocument) {
        this.uri = document.uri;
        this.lines = Util.deleteComments(document.getText()).split("\n");
    }

    public validate(): vsDiagnostic[] {
        const result: vsDiagnostic[] = [];
        this.parseJsStatements();
        this.statements.forEach((statement) => {
            const diagnostics: tsDiagnostic[] = [];
            ts.transpile(statement.declaration,
                { allowJs: true, checkJs: true, strict: true },
                undefined, diagnostics);
            for (const diagnostic of diagnostics) {
                const message = (typeof diagnostic.messageText === "string") ?
                    diagnostic.messageText : diagnostic.messageText.toString();
                result.push(Util.createDiagnostic(
                    { range: statement.range, uri: this.uri }, DiagnosticSeverity.Warning, message,
                ));
            }
        });
        return result;
    }

    private getCurrentLine(): string {
        return this.getLine(this.currentLineNumber);
    }

    private getLine(i: number): string {
        return this.lines[i].toLowerCase();
    }

    private parseJsStatements() {
        for (; this.currentLineNumber < this.lines.length; this.currentLineNumber++) {
            const line = this.getCurrentLine();
            this.match = /^[ \t]*script/.exec(line);
            if (this.match) {
                this.processScript();
                continue;
            }
            this.match = /(^[ \t]*(?:replace-)?value[ \t]*=[ \t]*)(\S+[ \t\S]*)$/.exec(line);
            if (this.match) {
                this.processValue();
                continue;
            }
            this.match = /(^[ \t]*options[ \t]*=[ \t]*javascript:[ \t]*)(\S+[ \t\S]*)$/.exec(line);
            if (this.match) {
                this.processOptions();
            }
        }
    }

    private processScript() {
        let line = this.getCurrentLine();
        let declaration: string;
        let range: Range;
        this.match = /(^[ \t]*script[ \t]*=[\s]*)(\S+[\s\S]*)$/m.exec(line);
        if (this.match) {
            declaration = this.match[2];
            const matchStart = this.match[1].length;
            range = {
                end: { character: matchStart + this.match[2].length, line: this.currentLineNumber },
                start: { character: this.match[1].length, line: this.currentLineNumber },
            };
            let j = this.currentLineNumber + 1;
            while (!(/\bscript\b/.test(this.getLine(j)) || /\bendscript\b/.test(this.getLine(j)))) {
                j++;
                if (j >= this.lines.length) { break; }
            }
            if (!(j === this.lines.length || /\bscript\b/.test(this.getLine(j)))) {
                line = this.getLine(++this.currentLineNumber);
                while (line && !/\bendscript\b/.test(line)) {
                    line = this.getLine(++this.currentLineNumber);
                    declaration += line + "\n";
                }
                range.end = {
                    character: this.getLine(this.currentLineNumber - 1).length, line: this.currentLineNumber - 1,
                };
            }
        } else {
            range = {
                end: { character: this.getLine(this.currentLineNumber + 1).length, line: this.currentLineNumber + 1 },
                start: { character: 0, line: this.currentLineNumber + 1 },
            };
            declaration = "";
            line = this.getLine(++this.currentLineNumber);
            while (line && !/\bendscript\b/.test(line)) {
                line = this.getLine(++this.currentLineNumber);
                declaration += line + "\n";
            }
            range.end = {
                character: this.getLine(this.currentLineNumber - 1).length, line: this.currentLineNumber - 1,
            };
        }
        const statement = { declaration, range };
        this.statements.push(statement);

    }

    private processValue() {
        const declaration = this.match[2];
        const matchStart = this.match.index + this.match[1].length;
        const statement = {
            declaration,
            range: {
                end: { character: matchStart + this.match[2].length, line: this.currentLineNumber },
                start: { character: matchStart, line: this.currentLineNumber },
            },

        };
        this.statements.push(statement);
    }

    private processOptions() {
        const declaration = this.match[2];
        const matchStart = this.match[1].length;
        const statement = {
            declaration, range: {
                end: { character: matchStart + this.match[2].length, line: this.currentLineNumber },
                start: { character: matchStart, line: this.currentLineNumber },
            },

        };
        this.statements.push(statement);
    }
}
