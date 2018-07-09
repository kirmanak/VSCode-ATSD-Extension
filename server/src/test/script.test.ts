import { TextDocument, Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';
import * as Shared from '../sharedFunctions';

function createDoc(text: string): TextDocument {
	return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

suite("Script endscript tests", () => {

	test("Correct empty script", () => {
		const text =
			`script\n` +
			`endscript`;
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.undefinedForVariables(document);
		assert.deepEqual(result, expected);
	});

	test("Unclosed empty script", () => {
		const text =
			`script\n` +
			`endscrpt`;
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 6 } } }, 
			DiagnosticSeverity.Error, "script has no matching endscript"
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("Script with unclosed for", () => {
		const text =
			`script\n` +
			`	for (let i = 0; i < 5; i++) {}\n` +
			`endscript`;
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("Two correct scripts", () => {
		const text =
			`script\n` +
			`	for (let i = 0; i < 5; i++) {}\n` +
			`endscript\n` +
			`script\n` +
			`	for (let i = 0; i < 5; i++) {}\n` +
			`endscript`;
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("Two unclosed scripts", () => {
		const text =
			`script\n` +
			`endscrpt\n` +
			`script\n` +
			`endscrpt`;
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 6 } } }, 
			DiagnosticSeverity.Error, "script has no matching endscript"
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});


});
