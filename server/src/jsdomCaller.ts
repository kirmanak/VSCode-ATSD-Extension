import { Range, TextDocument, Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as Shared from './sharedFunctions';

const jsdom = require("jsdom");
const jquery = require("jquery");

class Statement {
    range: Range;
    declaration: string;
    imports: string[];
}

function parseJsStatements(text: string): Statement[] {
    const result: Statement[] = [];
    const lines = text.split('\n');
    const imports: string[] = [];
    let importCounter = 0;
    let match: RegExpExecArray;

    for (let i = 0, len = lines.length; i < len; i++) {
        let line = lines[i];
        if (/^[ \t]*script/.test(line)) {
            let content: string;
            let range: Range;
            if (match = /(^[ \t]*script[ \t]*=[\s]*)(\S+[\s\S]*)$/m.exec(line)) {
                content = match[2];
                const matchStart = match[1].length
                range = {
                    start: { line: i, character: match[1].length },
                    end: { line: i, character: matchStart + match[2].length }
                };
                let j = i;
                while (++j < lines.length && !(/\bscript\b/.test(lines[j]) || /\bendscript\b/.test(lines[j])));
                if (!(j === lines.length || /\bscript\b/.test(lines[j]))) {
                    while ((line = lines[++i]) !== undefined && !/\bendscript\b/.test(line)) content += line + '\n';
                    range.end = { line: i - 1, character: lines[i - 1].length };
                }
            } else {
                range = {
                    start: { line: i + 1, character: 0 },
                    end: { line: i + 1, character: lines[i + 1].length }
                };
                content = "";
                while ((line = lines[++i]) !== undefined && !/\bendscript\b/.test(line)) content += line + '\n';
                range.end = { line: i - 1, character: lines[i - 1].length };
            }
            content = JSON.stringify(content);
            const statement = {
                range: range, imports: imports, declaration:
                    `const proxy = new Proxy({}, {});` +
                    `const proxyFunction = new Proxy(new Function(), {});` +
                    `(new Function("widget","config","dialog", ${content}))` +
                    `.call(window, proxyFunction, proxy, proxy)`
            };
            result.push(statement);
        } else if (match = /^[ \t]*import[ \t]+(\S+)[ \t]*=.+/.exec(line)) {
            imports.push(match[1]);
            importCounter++;
        } else if (match = /(^[ \t]*replace-value[ \t]*=[ \t]*)(\S+[ \t\S]*)$/.exec(line)) {
            const content = stringifyStatement(match[2]);
            const matchStart = match.index + match[1].length;
            const statement = {
                range: {
                    start: { line: i, character: matchStart },
                    end: { line: i, character: matchStart + match[2].length }
                },
                imports: imports,
                declaration:
                    `(new Function("value","time","previousValue","previousTime", ${content}))\n` +
                    `.call(window, 5, 5, 5, 5)`
            };
            result.push(statement);
        } else if (match = /(^[ \t]*value[ \t]*=[ \t]*)(\S+[ \t\S]*)$/.exec(line)) {
            const content = stringifyStatement(match[2]);
            const call = generateCall(importCounter);
            const matchStart = match.index + match[1].length;
            let importList = "";
            imports.forEach(imported => importList += `"${imported}", `);
            const statement = {
                range: {
                    start: { line: i, character: matchStart },
                    end: { line: i, character: matchStart + match[2].length }
                },
                imports: imports,
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
                    `proxyArray, proxyFunction, proxyFunction, proxyFunction${call})`
            };
            result.push(statement);
        } else if (match = /(^[ \t]*options[ \t]*=[ \t]*javascript:[ \t]*)(\S+[ \t\S]*)$/.exec(line)) {
            const content = stringifyStatement(match[2]);
            const matchStart = match[1].length;
            const statement = {
                range: {
                    start: { line: i, character: matchStart },
                    end: { line: i, character: matchStart + match[2].length }
                },
                imports: imports,
                declaration:
                    `const proxyFunction = new Proxy(new Function(), {});` +
                    `(new Function("requestMetricsSeriesValues","requestEntitiesMetricsValues",` +
                    `"requestPropertiesValues","requestMetricsSeriesOptions","requestEntitiesMetricsOptions",` +
                    `"requestPropertiesOptions", ${content}` +
                    `)).call(window, proxyFunction, proxyFunction, proxyFunction, proxyFunction,` +
                    ` proxyFunction, proxyFunction)`
            }
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
    const text: string = Shared.deleteComments(document.getText());
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
            statement.imports.forEach(imported => {
                if (imported.length !== 0 && new RegExp(imported, "i").test(err.message)) {
                    isImported = true;
                    console.log(`"${err.message}" contains "${imported}"`);
                }
            });
            if (!isImported) result.push(Shared.createDiagnostic({
                uri: document.uri, range: statement.range
            }, DiagnosticSeverity.Warning, err.message
            ));
            else console.log(err.message);
        }
    });

    return result;
}
