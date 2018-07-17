import { Diagnostic, DiagnosticSeverity, Location, TextDocument   } from "vscode-languageserver";

const diagnosticSource = "Axibase Charts";

export function createDiagnostic(location: Location, severity: DiagnosticSeverity, message: string): Diagnostic {
    const diagnostic: Diagnostic = {
        message, range: location.range,
        severity, source: diagnosticSource
    };
    return diagnostic;
}

export function deleteComments(text: string): string {
    const multiLine = /\/\*[\s\S]*?\*\//g;
    const oneLine = /^[ \t]*#.*/mg;
    let i: RegExpExecArray = multiLine.exec(text);
    if (!i) { i = oneLine.exec(text); }

    while (i) {
        let spaces = " ";
        for (let j = 1, len = i[0].length; j < len; j++) { spaces += " "; }
        const newLines = i[0].split("\n").length - 1;
        for (let j = 0; j < newLines; j++) { spaces += "\n"; }
        text = text.substring(0, i.index) + spaces +
            text.substring(i.index + i[0].length);
        i = multiLine.exec(text);
        if (!i) { i = oneLine.exec(text); }
    }

    return text;
}

export function createDoc(text: string): TextDocument {
    return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

export function errorMessage(found: string, suggestion: string): string {
    return (suggestion === null) ? `${found} is unknown.` : `${found} is unknown. Suggestion: ${suggestion}`;
}
