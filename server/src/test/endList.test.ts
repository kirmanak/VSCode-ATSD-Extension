import { TextDocument, Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';
import * as Shared from '../sharedFunctions';

function createDoc(text: string): TextDocument {
	return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

const errorMessage = "list has no matching endlist";

suite("Unfinished list", () => {

	test("One correct oneline list", () => {
		const text =
			'list servers = vps, vds\n';
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One correct multiline list", () => {
		const text =
			'list servers = vps, \n' +
			'	vds\n' +
			'endlist';
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One incorrect multiline list", () => {
		const text =
			'list servers = vps, \n' +
			'	vds\n' +
			'edlist';
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 0, character: 0 }, end: {line: 0, character: 4 } } },
			DiagnosticSeverity.Error, errorMessage
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("Three lists, one incorrect", () => {
		const text =
			'list servers = vps, \n' +
			'	vds\n' +
			'endlist\n' +
			'list servers = vps, \n' +
			'	vds\n' +
			'edlist\n' +
			'list servers = vps, \n' +
			'	vds\n' +
			'endlist\n';
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 3, character: 0 }, end: {line: 3, character: 4 } } },
			DiagnosticSeverity.Error, errorMessage
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);

	});

});
