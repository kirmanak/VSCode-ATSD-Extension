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
    const startScriptRegex = /\bscript\b/;
    const endScriptRegex = /\bendscript\b/;
    const replaceValueRegex = /(replace-value[ \t]*=[ \t]*)(\S+[ \t\S]*)$/;
    const valueRegex = /(value[ \t]*=[ \t]*)(\S+[ \t\S]*)$/;
    const importRegex = /import[ \t]+(\S+)[ \t]*=.+/;
    const lines = text.split('\n');
    let importList: string = "";
    let importCounter = 0;
    let match: RegExpExecArray;

    for (let i = 0, len = lines.length; i < len; i++) {
        let line = lines[i];
        if (startScriptRegex.test(line)) {
            const start = i + 1;
            let content = "";
            while ((line = lines[++i]) !== undefined && !endScriptRegex.test(line)) content += line + '\n';
            content = JSON.stringify(content);
            const call = generateCall(3);
            console.log(lines[i-1]);
            const statement = {
                range: {
                    start: { line: start, character: 0 },
                    end: { line: i - 1, character: lines[i - 1].length }
                },
                declaration:
                    `const proxy = new Proxy({}, {});\n` +
                    `(new Function("widget","config","dialog", ${content}))\n` +
                    `.call(window, ${call})`
            };
            console.log(statement);
            result.push(statement);
        }
        if (match = importRegex.exec(line)) {
            importList += `"${match[1]}",`;
            importCounter++;
        }
        if (match = valueRegex.exec(line)) {
            const content = stringifyStatement(match[2]);
            const call = generateCall(40 + importCounter);
            const matchStart = match.index + match[1].length;
            const statement = {
                range: {
                    start: { line: i, character: matchStart },
                    end: { line: i, character: matchStart + match[2].length }
                },
                declaration:
                    `const proxy = new Proxy({}, {});\n` +
                    `(new Function("metric","entity","tags","value","previous","movavg",\n` +
                    `"detail","forecast","forecast_deviation","lower_confidence","upper_confidence",\n` +
                    `"percentile","max","min","avg","sum","delta","counter","last","first",\n` +
                    `"min_value_time","max_value_time","count","threshold_count","threshold_percent",\n` +
                    `"threshold_duration","time","bottom","top","meta","entityTag","metricTag","median",\n` +
                    `"average","minimum","maximum","series","getValueWithOffset","getValueForDate",\n` +
                    `"getMaximumValue", ${importList} ${content}\n` +
                    `)).call(window, ${call})`
            };
            result.push(statement);
        }
        if (match = replaceValueRegex.exec(line)) {
            const content = stringifyStatement(match[2]);
            const call = generateCall(4);
            const matchStart = match.index + match[1].length;
            const statement = {
                range: {
                    start: { line: i, character: matchStart },
                    end: { line: i, character: matchStart + match[2].length }
                },
                declaration:
                    `const proxy = new Proxy({}, {});\n` +
                    `(new Function("value","time","previousValue","previousTime", ${content}))\n` +
                    `.call(window, ${call})`
            };
            result.push(statement);
        }
    }

    /*
    let endMatch: RegExpExecArray;
    while (match = startScriptRegex.exec(text)) {
        if (endMatch = endScriptRegex.exec(text)) {
            if (endMatch.index > match.index) {
                const statement = {
                    content: text.substring(match.index, endMatch.index),
                    start: match.index, end: endMatch.index
                };
                result.push(statement);
            }
        }
    }
    */

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
    let call = "proxy";
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
