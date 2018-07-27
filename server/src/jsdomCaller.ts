import { Diagnostic, DiagnosticSeverity, Range, TextDocument } from "vscode-languageserver/lib/main";
import Util from "./Util";

// tslint:disable-next-line:no-var-requires
const jsdom = require("jsdom");
// tslint:disable-next-line:no-var-requires
const jquery = require("jquery");

class Statement {
    public range: Range;
    public declaration: string;
    public imports: string[];
}

function parseJsStatements(text: string): Statement[] {
    const result: Statement[] = [];
    const lines = text.split("\n");
    const imports: string[] = [];
    let importCounter = 0;
    let match: RegExpExecArray;

    for (let i = 0, len = lines.length; i < len; i++) {
        let line = lines[i];
        if (/^[ \t]*script/.test(line)) {
            let content: string;
            let range: Range;
            match = /(^[ \t]*script[ \t]*=[\s]*)(\S+[\s\S]*)$/m.exec(line);
            if (match) {
                content = match[2];
                const matchStart = match[1].length;
                range = {
                    end: { character: matchStart + match[2].length, line: i },
                    start: { character: match[1].length, line: i },
                };
                let j = i + 1;
                while (j < lines.length && !(/\bscript\b/.test(lines[j]) || /\bendscript\b/.test(lines[j]))) {
                    j++;
                }
                if (!(j === lines.length || /\bscript\b/.test(lines[j]))) {
                    line = lines[++i];
                    while (line && !/\bendscript\b/.test(line)) {
                        line = lines[++i];
                        content += line + "\n";
                    }
                    range.end = { line: i - 1, character: lines[i - 1].length };
                }
            } else {
                range = {
                    end: { character: lines[i + 1].length, line: i + 1 },
                    start: { character: 0, line: i + 1 },
                };
                content = "";
                line = lines[++i];
                while (line && !/\bendscript\b/.test(line)) {
                    line = lines[++i];
                    content += line + "\n";
                }
                range.end = { line: i - 1, character: lines[i - 1].length };
            }
            content = JSON.stringify(content);
            const statement = {
                declaration:
                    `const proxy = new Proxy({}, {});` +
                    `const proxyFunction = new Proxy(new Function(), {});` +
                    `(new Function("widget","config","dialog", ${content}))` +
                    `.call(window, proxyFunction, proxy, proxy)`,
                imports, range,
            };
            result.push(statement);
        } else if (/^[ \t]*import[ \t]+(\S+)[ \t]*=.+/.test(line)) {
            match = /^[ \t]*import[ \t]+(\S+)[ \t]*=.+/.exec(line);
            imports.push(match[1]);
            importCounter++;
        } else if (/(^[ \t]*replace-value[ \t]*=[ \t]*)(\S+[ \t\S]*)$/.test(line)) {
            match = /(^[ \t]*replace-value[ \t]*=[ \t]*)(\S+[ \t\S]*)$/.exec(line);
            const content = stringifyStatement(match[2]);
            const matchStart = match.index + match[1].length;
            const statement = {
                declaration:
                    `(new Function("value","time","previousValue","previousTime", ${content}))\n` +
                    `.call(window, 5, 5, 5, 5)`,
                imports,
                range: {
                    end: { character: matchStart + match[2].length, line: i },
                    start: { character: matchStart, line: i },
                },
            };
            result.push(statement);
        } else if (/(^[ \t]*value[ \t]*=[ \t]*)(\S+[ \t\S]*)$/.test(line)) {
            match = /(^[ \t]*value[ \t]*=[ \t]*)(\S+[ \t\S]*)$/.exec(line);
            const content = stringifyStatement(match[2]);
            const call = generateCall(importCounter);
            const matchStart = match.index + match[1].length;
            let importList = "";
            imports.forEach((imported) => importList += `"${imported}", `);
            const statement = {
                declaration:
                    `const proxy = new Proxy({}, {});` +
                    `const proxyFunction = new Proxy(new Function(), {});` +
                    `const proxyArray = new Proxy([], {});` +
                    `(new Function("metric","entity","tags","value","previous","movavg",` +
                    `"detail","forecast","forecast_deviation","lower_confidence","upper_confidence",` +
                    `"percentile","max","min","avg","sum","delta","counter","last","first",` +
                    `"min_value_time","max_value_time","count","threshold_count","threshold_percent",` +
                    `"threshold_duration","time","bottom","top","meta","entityTag","metricTag","median",` +
                    `"average","minimum","maximum","series","getValueWithOffset","getValueForDate",` +
                    `"getMaximumValue", ${importList} ${content}` +
                    `)).call(window, proxy, proxy, proxy, proxyFunction, proxyFunction, proxyFunction,` +
                    `proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction,` +
                    `proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction,` +
                    `proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction,` +
                    `proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction,` +
                    `proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction,` +
                    `proxyArray, proxyFunction, proxyFunction, proxyFunction${call})`,
                imports,
                range: {
                    end: { character: matchStart + match[2].length, line: i },
                    start: { character: matchStart, line: i },
                },

            };
            result.push(statement);
        } else if (/(^[ \t]*options[ \t]*=[ \t]*javascript:[ \t]*)(\S+[ \t\S]*)$/.test(line)) {
            match = /(^[ \t]*options[ \t]*=[ \t]*javascript:[ \t]*)(\S+[ \t\S]*)$/.exec(line);
            const content = stringifyStatement(match[2]);
            const matchStart = match[1].length;
            const statement = {
                declaration:
                    `const proxyFunction = new Proxy(new Function(), {});` +
                    `(new Function("requestMetricsSeriesValues","requestEntitiesMetricsValues",` +
                    `"requestPropertiesValues","requestMetricsSeriesOptions","requestEntitiesMetricsOptions",` +
                    `"requestPropertiesOptions", ${content}` +
                    `)).call(window, proxyFunction, proxyFunction, proxyFunction, proxyFunction,` +
                    ` proxyFunction, proxyFunction)`,
                imports,
                range: {
                    end: { character: matchStart + match[2].length, line: i },
                    start: { character: matchStart, line: i },
                },

            };
            result.push(statement);
        }
    }

    return result;
}

function stringifyStatement(content: string): string {
    if (!content.startsWith("return")) {
        content = "return " + content;
    }
    if (!content.endsWith(";")) {
        content = content + ";";
    }
    content = JSON.stringify(content);
    return content;
}

// amount is the number of arguments required for a function
function generateCall(amount: number): string {
    let call = ", proxy";
    for (let i = 1; i < amount; i++) {
        call += ", proxy";
    }
    return call;
}

export function validate(document: TextDocument): Diagnostic[] {
    const result: Diagnostic[] = [];
    const text: string = Util.deleteComments(document.getText());
    const statements: Statement[] = parseJsStatements(text);

    const dom = new jsdom.JSDOM(`<html></html>`, { runScripts: "outside-only" });
    const window = dom.window;
    const $ = jquery(dom.window);
    statements.forEach((statement) => {
        // statement.declaration = "try {" + statement.declaration + "} catch (err) { throw err; }";
        const toEvaluate = `(new Function("$", ${JSON.stringify(statement.declaration)})).call(window, ${$})`;
        try {
            window.eval(toEvaluate);
        } catch (err) {
            let isImported = false;
            statement.imports.forEach((imported) => {
                if (imported.length !== 0 && new RegExp(imported, "i").test(err.message)) {
                    isImported = true;
                }
            });
            if (!isImported) {
                result.push(Util.createDiagnostic(
                    { uri: document.uri, range: statement.range },
                    DiagnosticSeverity.Warning, err.message,
                ));
            }
        }
    });

    return result;
}
