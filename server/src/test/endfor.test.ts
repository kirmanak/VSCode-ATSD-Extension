import { TextDocument, Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';
import * as Shared from '../sharedFunctions';

function createDoc(text: string): TextDocument {
    return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

suite("Unmatched endfor tests", () => {

    test("One correct loop", () => {
        const text =
            "for server in servers\n" +
            "   do something\n" +
            "endfor";
        const document: TextDocument = createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Two correct loops", () => {
        const text =
            "for server in servers\n" +
            "   do something\n" +
            "endfor\n" +
            "for server in servers\n" +
            "   do something\n" +
            "endfor";
        const document: TextDocument = createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("One incorrect loop", () => {
        const text =
            "for server in servers\n" +
            "   do something\n";
        const document: TextDocument = createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
		{ uri: document.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } } },
		DiagnosticSeverity.Error, "for has no matching endfor"
	)];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Two incorrect loops", () => {
        const text =
            "for server in servers\n" +
            "   do something\n" +
            "for server in servers\n" +
            "   do something\n";
        const document: TextDocument = createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
		{ uri: document.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } } },
		DiagnosticSeverity.Error, "for has no matching endfor"
	), Shared.createDiagnostic(
		{ uri: document.uri, range: { start: { line: 2, character: 0 }, end: { line: 2, character: 3 } } },
		DiagnosticSeverity.Error, "for has no matching endfor"
	)];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });


    test("One incorrect loop, one correct loop", () => {
        const text =
            "for server in servers\n" +
            "   do something\n" +
            "for server in servers\n" +
            "   do something\n" +
            "endfor";
        const document: TextDocument = createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
		{ uri: document.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } } },
		DiagnosticSeverity.Error, "for has no matching endfor"
	)];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });
});
