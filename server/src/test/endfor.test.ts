import { TextDocument, Diagnostic, Location, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';

function createDoc(text: string): TextDocument {
    return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

function createDiagnostic(location: Location): Diagnostic {
    const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: location.range,
        message: "For loop has no matching endfor",
        source: diagnosticSource,
        relatedInformation: []
    };
    diagnostic.relatedInformation.push({
        location: location,
        message: "For keyword expects endfor keyword"
    });
    return diagnostic;
}

const diagnosticSource = "Axibase Visual Plugin";
suite("Unmatched endfor tests", () => {

    test("One correct loop", () => {
        const text =
            "for server in servers\n" +
            "   #do something\n" +
            "endfor";
        const document: TextDocument = createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.unmatchedEndFor(document, true);
        assert.deepEqual(result, expected);
    });

    test("Two correct loops", () => {
        const text =
            "for server in servers\n" +
            "   #do something\n" +
            "endfor\n" +
            "for server in servers\n" +
            "   #do something\n" +
            "endfor";
        const document: TextDocument = createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.unmatchedEndFor(document, true);
        assert.deepEqual(result, expected);
    });

    test("One incorrect loop", () => {
        const text =
            "for server in servers\n" +
            "   #do something\n";

        const document: TextDocument = createDoc(text);
        const expected: Diagnostic[] = [createDiagnostic({
            uri: document.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } }
        })];
        const result = Functions.unmatchedEndFor(document, true);
        assert.deepEqual(result, expected);
    });

    test("Two incorrect loops", () => {
        const text =
            "for server in servers\n" +
            "   #do something\n" +
            "for server in servers\n" +
            "   #do something\n";
        const document: TextDocument = createDoc(text);
        const expected: Diagnostic[] = [createDiagnostic({
            uri: document.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } }
        }), createDiagnostic({
            uri: document.uri, range: { start: { line: 2, character: 0 }, end: { line: 2, character: 3 } }
        })];
        const result = Functions.unmatchedEndFor(document, true);
        assert.deepEqual(result, expected);
    });


    test("One incorrect loop, one correct loop", () => {
        const text =
            "for server in servers\n" +
            "   #do something\n" +
            "for server in servers\n" +
            "   #do something\n" +
            "endfor";
        const document: TextDocument = createDoc(text);
        const expected: Diagnostic[] = [createDiagnostic({
            uri: document.uri, range: { start: { line: 2, character: 0}, end: { line: 2, character: 3} }
        })];
        const result = Functions.unmatchedEndFor(document, true);
        assert.deepEqual(result, expected);
    });
});