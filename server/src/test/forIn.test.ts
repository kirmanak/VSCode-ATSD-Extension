import { TextDocument, Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';
import * as Shared from '../sharedFunctions';

function createDoc(text: string): TextDocument {
	return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

suite("Undeclared list or var", () => {

	test("Correct one-line list, correct for", () => {
		const text =
			"list servers = 'srv1', 'srv2'\n" +
            "for srv in servers\n" +
            "   #do something\n" +
            "endfor\n";
		const document = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
    });

    test("Correct one-line list, incorrect for", () => {
		const text =
			"list servers = 'srv1', 'srv2'\n" +
            "for srv in server\n" +
            "   #do something\n" +
            "endfor\n";
		const document = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
            { uri: document.uri, range: { start: { line: 1, character: 11 }, end: { line: 1, character: 17 } } },
            DiagnosticSeverity.Error, `server is unknown. Declare a var or a list`
        )];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
    });

    test("Correct one-line var(array), incorrect for", () => {
		const text =
			"var servers = ['srv1', 'srv2']\n" +
            "for srv in server\n" +
            "   #do something\n" +
            "endfor\n";
		const document = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
            { uri: document.uri, range: { start: { line: 1, character: 11 }, end: { line: 1, character: 17 } } },
            DiagnosticSeverity.Error, `server is unknown. Declare a var or a list`
        )];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
    });

    test("Correct one-line var(array), correct for", () => {
		const text =
			"var servers = ['srv1', 'srv2']\n" +
            "for srv in servers\n" +
            "   #do something\n" +
            "endfor\n";
		const document = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

    test("Correct one-line var(props), incorrect for", () => {
		const text =
			"var servers = {'srv1': 'srv2'}\n" +
            "for srv in server\n" +
            "   #do something\n" +
            "endfor\n";
		const document = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
            { uri: document.uri, range: { start: { line: 1, character: 11 }, end: { line: 1, character: 17 } } },
            DiagnosticSeverity.Error, `server is unknown. Declare a var or a list`
        )];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
    });

    test("Correct one-line var(props), correct for", () => {
		const text =
			"var servers = {'srv1': 'srv2'}\n" +
            "for srv in servers\n" +
            "   #do something\n" +
            "endfor\n";
		const document = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
    });

    test("Correct multi-line list, correct for", () => {
        const text =
            "list servers = 'srv1', \n" +
            "   'srv2'\n" +
            "endlist\n" +
            "for srv in servers\n" +
            "   #do something\n" +
            "endfor\n";
        const document = createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Correct multi-line list, incorrect for", () => {
        const text =
            "list servers = 'srv1', \n" +
            "   'srv2'\n" +
            "endlist\n" +
            "for srv in server\n" +
            "   #do something\n" +
            "endfor\n";
        const document = createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            { uri: document.uri, range: { start: { line: 3, character: 11 }, end: { line: 3, character: 17 } } },
            DiagnosticSeverity.Error, `server is unknown. Declare a var or a list`
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Correct multi-line var(array), incorrect for", () => {
        const text =
            "var servers = ['srv1', \n" +
            "   'srv2'\n" +
            "]\n" +
            "endvar\n" +
            "for srv in server\n" +
            "   #do something\n" +
            "endfor\n";
        const document = createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            { uri: document.uri, range: { start: { line: 4, character: 11 }, end: { line: 4, character: 17 } } },
            DiagnosticSeverity.Error, `server is unknown. Declare a var or a list`
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Correct multi-line var(array), correct for", () => {
        const text =
            "var servers = ['srv1', \n" +
            "   'srv2'\n" +
            "]\n" +
            "endvar\n" +
            "for srv in servers\n" +
            "   #do something\n" +
            "endfor\n";
        const document = createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Correct multi-line var(props), incorrect for", () => {
        const text =
            "var servers = {\n" +
            "   'srv1': 'srv2'\n" +
            "}\n" +
            "endvar\n" +
            "for srv in server\n" +
            "   #do something\n" +
            "endfor\n";
        const document = createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            { uri: document.uri, range: { start: { line: 4, character: 11 }, end: { line: 4, character: 17 } } },
            DiagnosticSeverity.Error, `server is unknown. Declare a var or a list`
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Correct multi-line var(props), correct for", () => {
        const text =
            "var servers = {\n" +
            "   'srv1': 'srv2'\n" +
            "}\n" +
            "endvar\n" +
            "for srv in servers\n" +
            "   #do something\n" +
            "endfor\n";
        const document = createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Correct multi-line var(props), correct for before var", () => {
        const text =
            "for srv in servers\n" +
            "   #do something\n" +
            "endfor\n" +
            "var servers = {\n" +
            "   'srv1': 'srv2'\n" +
            "}\n" +
            "endvar\n";
        const document = createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            { uri: document.uri, range: { start: { line: 0, character: 11 }, end: { line: 0, character: 18 } } },
            DiagnosticSeverity.Error, `servers is unknown. Declare a var or a list`
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

});