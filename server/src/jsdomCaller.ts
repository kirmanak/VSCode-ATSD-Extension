import { Range, TextDocument, Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as Shared from './sharedFunctions';

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

class Statement {
    range: Range;
    declaration: string;
}

function parseJsStatements(text: string): Statement[] {
    const result: Statement[] = [];
    const lines = text.split('\n');
    let importList: string = "";
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
                    console.log("'script =' is multiline")
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
                range: range, declaration:
                    `const proxy = new Proxy({}, {});\n` +
                    `const proxyFunction = new Proxy(new Function(), {});\n` +
                    `(new Function("widget","config","dialog", ${content}))\n` +
                    `.call(window, proxyFunction, proxy, proxy)`
            };
            result.push(statement);
        } else if (match = /^[ \t]*import[ \t]+(\S+)[ \t]*=.+/.exec(line)) {
            importList += `"${match[1]}",`;
            importCounter++;
        } else if (match = /(^[ \t]*replace-value[ \t]*=[ \t]*)(\S+[ \t\S]*)$/.exec(line)) {
            const content = stringifyStatement(match[2]);
            const matchStart = match.index + match[1].length;
            const statement = {
                range: {
                    start: { line: i, character: matchStart },
                    end: { line: i, character: matchStart + match[2].length }
                },
                declaration:
                    `(new Function("value","time","previousValue","previousTime", ${content}))\n` +
                    `.call(window, 5, 5, 5, 5)`
            };
            result.push(statement);
        } else if (match = /(^[ \t]*value[ \t]*=[ \t]*)(\S+[ \t\S]*)$/.exec(line)) {
            const content = stringifyStatement(match[2]);
            const call = generateCall(importCounter);
            const matchStart = match.index + match[1].length;
            const statement = {
                range: {
                    start: { line: i, character: matchStart },
                    end: { line: i, character: matchStart + match[2].length }
                },
                declaration:
                    `const proxy = new Proxy({}, {});\n` +
                    `const proxyFunction = new Proxy(new Function(), {});\n` +
                    `const proxyArray = new Proxy([], {});\n` +
                    `(new Function("metric","entity","tags","value","previous","movavg",\n` +
                    `"detail","forecast","forecast_deviation","lower_confidence","upper_confidence",\n` +
                    `"percentile","max","min","avg","sum","delta","counter","last","first",\n` +
                    `"min_value_time","max_value_time","count","threshold_count","threshold_percent",\n` +
                    `"threshold_duration","time","bottom","top","meta","entityTag","metricTag","median",\n` +
                    `"average","minimum","maximum","series","getValueWithOffset","getValueForDate",\n` +
                    `"getMaximumValue", ${importList} ${content}\n` +
                    `)).call(window, proxy, proxy, proxy, proxyFunction, proxyFunction, proxyFunction, \n` +
                    `proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction, \n` +
                    `proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction, \n` +
                    `proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction, \n` +
                    `proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction, \n` +
                    `proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction, proxyFunction, \n` +
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
                }, declaration:
                    `const proxyFunction = new Proxy(new Function(), {});\n` +
                    `(new Function("requestMetricsSeriesValues","requestEntitiesMetricsValues",\n` +
                    `"requestPropertiesValues","requestMetricsSeriesOptions","requestEntitiesMetricsOptions",\n` +
                    `"requestPropertiesOptions", ${content}\n` +
                    `)).call(window, proxyFunction, proxyFunction, proxyFunction, proxyFunction,\n` +
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

    const dom = new JSDOM(``, { resources: "usable", runScripts: "dangerously" });
    const window = dom.window;
    statements.forEach((statement) => {
        try {
            window.eval(statement.declaration);
        } catch (err) {
            result.push(Shared.createDiagnostic({
                uri: document.uri, range: statement.range
            }, DiagnosticSeverity.Warning, err.message
            ))
        }
    });

    return result;
}
