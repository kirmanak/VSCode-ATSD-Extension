import { Diagnostic, DiagnosticSeverity, Range } from "vscode-languageserver";
import { createDiagnostic, deleteComments } from "./util";

import * as $ from "jquery";
import { DOMWindow, JSDOM } from "jsdom";
import { TextRange } from "./textRange";

export class JsDomCaller {
    private static readonly CONTENT_POSITION: number = 2;
    private static generateCall(amount: number, name: string): string {
        const names: string = Array(amount)
            .fill(name)
            .join();

        return `, ${names}`;
    }

    private static stringifyStatement(content: string): string {
        let statement: string = content.trim();
        if (!statement.startsWith("return")) {
            statement = `return ${content}`;
        }
        if (!content.endsWith(";")) {
            statement = `${statement};`;
        }

        return JSON.stringify(statement);
    }

    private currentLineNumber: number = 0;
    private importCounter: number = 0;
    private readonly imports: string[] = [];
    private readonly lines: string[];
    private match: RegExpExecArray;
    private readonly statements: TextRange[] = [];

    public constructor(text: string) {
        this.lines = deleteComments(text)
            .split("\n");
    }

    public validate(): Diagnostic[] {
        const result: Diagnostic[] = [];
        this.parseJsStatements();

        const dom: JSDOM = new JSDOM("<html></html>", { runScripts: "outside-only" });
        const window: DOMWindow = dom.window;
        const jquery: JQuery<DOMWindow> = $(dom.window);
        this.statements.forEach((statement: TextRange) => {
            const toEvaluate: string =
                `(new Function("$", ${JSON.stringify(statement.text)})).call(window, ${jquery})`;
            try {
                window.eval(toEvaluate);
            } catch (err) {
                let isImported: boolean = false;
                for (const imported of this.imports) {
                    if (new RegExp(imported, "i").test(err.message)) {
                        isImported = true;
                        break;
                    }
                }
                if (!isImported) {
                    result.push(createDiagnostic(
                        statement.range,
                        DiagnosticSeverity.Warning, err.message,
                    ));
                }
            }
        });

        return result;
    }

    private getCurrentLine(): string {
        return this.getLine(this.currentLineNumber);
    }

    private getLine(i: number): string {
        return this.lines[i];
    }

    private parseJsStatements(): void {
        for (; this.currentLineNumber < this.lines.length; this.currentLineNumber++) {
            const line: string = this.getCurrentLine();
            this.match = /^[ \t]*script/.exec(line);
            if (this.match) {
                this.processScript();
                continue;
            }
            this.match = /^[ \t]*import[ \t]+(\S+)[ \t]*=.+/.exec(line);
            if (this.match) {
                this.imports.push(this.match[1]);
                this.importCounter++;
                continue;
            }
            this.match = /(^[ \t]*replace-value[ \t]*=[ \t]*)(\S+[ \t\S]*)$/.exec(line);
            if (this.match) {
                this.processReplaceValue();
                continue;
            }
            this.match = /(^[ \t]*value[ \t]*=[ \t]*)(\S+[ \t\S]*)$/.exec(line);
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

    private processOptions(): void {
        const content: string = JsDomCaller.stringifyStatement(this.match[JsDomCaller.CONTENT_POSITION]);
        const matchStart: number = this.match[1].length;
        const proxyFunctionCount: number = 6;
        const statement: TextRange = TextRange.create(
            "const proxyFunction = new Proxy(new Function(), {});" +
            '(new Function("requestMetricsSeriesValues","requestEntitiesMetricsValues",' +
            '"requestPropertiesValues","requestMetricsSeriesOptions","requestEntitiesMetricsOptions",' +
            `"requestPropertiesOptions", ${content}` +
            `)).call(window${JsDomCaller.generateCall(proxyFunctionCount, "proxyFunction")})`,
            Range.create(
                this.currentLineNumber, matchStart,
                this.currentLineNumber, matchStart + this.match[JsDomCaller.CONTENT_POSITION].length,
            ),
        );
        this.statements.push(statement);
    }

    private processReplaceValue(): void {
        const content: string = JsDomCaller.stringifyStatement(this.match[JsDomCaller.CONTENT_POSITION]);
        const matchStart: number = this.match.index + this.match[1].length;
        const numbersCount: number = 4;
        const statement: TextRange = TextRange.create(
            `(new Function("value","time","previousValue","previousTime", ${content}))
                .call(window${JsDomCaller.generateCall(numbersCount, "5")})`,
            Range.create(
                this.currentLineNumber, matchStart,
                this.currentLineNumber, matchStart + this.match[JsDomCaller.CONTENT_POSITION].length,
            ),
        );
        this.statements.push(statement);
    }

    private processScript(): void {
        let line: string = this.getCurrentLine();
        let content: string;
        let range: Range;
        this.match = /(^[ \t]*script[ \t]*=[\s]*)(\S+[\s\S]*)$/m.exec(line);
        if (this.match) {
            content = this.match[JsDomCaller.CONTENT_POSITION];
            const matchStart: number = this.match[1].length;
            range = {
                end: {
                    character: matchStart + this.match[JsDomCaller.CONTENT_POSITION].length,
                    line: this.currentLineNumber,
                },
                start: { character: this.match[1].length, line: this.currentLineNumber },
            };
            let j: number = this.currentLineNumber + 1;
            while (!(/\bscript\b/.test(this.getLine(j)) || /\bendscript\b/.test(this.getLine(j)))) {
                j++;
                if (j >= this.lines.length) { break; }
            }
            if (!(j === this.lines.length || /\bscript\b/.test(this.getLine(j)))) {
                line = this.getLine(++this.currentLineNumber);
                while (line !== undefined && !/\bendscript\b/.test(line)) {
                    content += `${line}\n`;
                    line = this.getLine(++this.currentLineNumber);
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
            content = "";
            line = this.getLine(++this.currentLineNumber);
            while (line !== undefined && !/\bendscript\b/.test(line)) {
                content += `${line}\n`;
                line = this.getLine(++this.currentLineNumber);
            }
            range.end = {
                character: this.getLine(this.currentLineNumber - 1).length, line: this.currentLineNumber - 1,
            };
        }
        content = JSON.stringify(content);
        const proxyCount: number = 2;
        const statement: TextRange = TextRange.create(
            "const proxy = new Proxy({}, {});" +
            "const proxyFunction = new Proxy(new Function(), {});" +
            `(new Function("widget","config","dialog", ${content}))` +
            `.call(window${JsDomCaller.generateCall(1, "proxyFunction")}` +
            `${JsDomCaller.generateCall(proxyCount, "proxy")})`,
            range,
        );
        this.statements.push(statement);

    }

    private processValue(): void {
        const content: string = JsDomCaller.stringifyStatement(this.match[JsDomCaller.CONTENT_POSITION]);
        const matchStart: number = this.match.index + this.match[1].length;
        const importList: string = `"${this.imports.join('","')}"`;
        const proxyCount: number = 3;
        const proxyFunctionCountFirst: number = 33;
        const proxyArrayCount: number = 1;
        const proxyFunctionCountSecond: number = 3;
        const statement: TextRange = TextRange.create(
            "const proxy = new Proxy({}, {});" +
            "const proxyFunction = new Proxy(new Function(), {});" +
            "const proxyArray = new Proxy([], {});" +
            '(new Function("metric","entity","tags","value","previous","movavg",' +
            '"detail","forecast","forecast_deviation","lower_confidence","upper_confidence",' +
            '"percentile","max","min","avg","sum","delta","counter","last","first",' +
            '"min_value_time","max_value_time","count","threshold_count","threshold_percent",' +
            '"threshold_duration","time","bottom","top","meta","entityTag","metricTag","median",' +
            '"average","minimum","maximum","series","getValueWithOffset","getValueForDate",' +
            `"getMaximumValue", ${importList}, ${content}` +
            `)).call(window${JsDomCaller.generateCall(proxyCount, "proxy")}` +
            `${JsDomCaller.generateCall(proxyFunctionCountFirst, "proxyFunction")}` +
            `${JsDomCaller.generateCall(proxyArrayCount, "proxyArray")}` +
            `${JsDomCaller.generateCall(proxyFunctionCountSecond, "proxyFunction")}` +
            `${JsDomCaller.generateCall(this.importCounter, "proxy")})`,
            Range.create(
                this.currentLineNumber, matchStart,
                this.currentLineNumber, matchStart + this.match[JsDomCaller.CONTENT_POSITION].length,
            ),
        );
        this.statements.push(statement);
    }
}
