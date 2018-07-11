import { TextDocument, Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';
import * as Shared from '../sharedFunctions';

function createDoc(text: string): TextDocument {
	return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

const firstVar = 'serv';
const secondVar = 'server';
const thirdVar = 'srv';

suite("Undefined variable in for loop", () => {

	test("One correct loop", () => {
		const text =
			"list servers = 'srv1', 'srv2'\n" +
			`for ${firstVar} in servers\n` +
			`   entity = @{${firstVar}}\n` +
			"endfor";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One correct loop with comment", () => {
		const text =
			"list servers = 'srv1', 'srv2'\n" +
			`for ${firstVar} /* this is a comment */ in servers\n` +
			`   entity = @{${firstVar}}\n` +
			"endfor";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("Two correct  loops", () => {
		const text =
			"list servers = 'srv1', 'srv2'\n" +
			`for ${firstVar} in servers\n` +
			`   entity = @{${firstVar}}\n` +
			"endfor\n" +
			`for ${firstVar} in servers\n` +
			`   entity = @{${firstVar}}\n` +
			"endfor";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One incorrect loop", () => {
		const text =
			"list servers = 'srv1', 'srv2'\n" +
			`for ${secondVar} in servers\n` +
			`   entity = @{${firstVar}}\n` +
			"endfor";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 2, character: 14 }, end: { line: 2, character: 14 + firstVar.length } } },
			DiagnosticSeverity.Error, `${firstVar} is used in loop, but wasn't declared`
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("Two incorrect loops", () => {
		const text =
			"list servers = 'srv1', 'srv2'\n" +
			`for ${secondVar} in servers\n` +
			`   entity = @{${firstVar}}\n` +
			"endfor\n" +
			`for ${firstVar} in servers\n` +
			`   entity = @{${secondVar}}\n` +
			"endfor";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 2, character: 14 }, end: { line: 2, character: 14 + firstVar.length } } },
			DiagnosticSeverity.Error, `${firstVar} is used in loop, but wasn't declared`
		), Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 5, character: 14 }, end: { line: 5, character: 14 + secondVar.length } } },
			DiagnosticSeverity.Error, `${secondVar} is used in loop, but wasn't declared`
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One incorrect loop, one correct loop", () => {
		const text =
			"list servers = 'srv1', 'srv2'\n" +
			`for ${secondVar} in servers\n` +
			`   entity = @{${firstVar}}\n` +
			"endfor\n" +
			`for ${firstVar} in servers\n` +
			`   entity = @{${firstVar}}\n` +
			"endfor";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 2, character: 14 }, end: { line: 2, character: 14 + firstVar.length } } },
			DiagnosticSeverity.Error, `${firstVar} is used in loop, but wasn't declared`
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One correct nested loop", () => {
		const text =
			"list servers = 'srv1', 'srv2'\n" +
			`for ${secondVar} in servers\n` +
			`   entity = @{${secondVar}}\n` +
			`   for ${firstVar} in servers\n` +
			`       entity = @{${secondVar}}\n` +
			`       entity = @{${firstVar}}\n` +
			"   endfor\n" +
			"endfor";
		const document: TextDocument = createDoc(text);
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, []);
	});

	test("One incorrect nested loop", () => {
		const text =
			"list servers = 'srv1', 'srv2'\n" +
			`for ${secondVar} in servers\n` +
			`   entity = @{${secondVar}}\n` +
			`   for ${firstVar} in servers\n` +
			`       entity = @{${thirdVar}}\n` +
			`       entity = @{${firstVar}}\n` +
			"   endfor\n" +
			"endfor";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 4, character: 18 }, end: { line: 4, character: 18 + thirdVar.length } } },
			DiagnosticSeverity.Error, `${thirdVar} is used in loop, but wasn't declared`
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("Arithmetic expression with correct var", () => {
		const text =
			"list servers = 'srv1', 'srv2'\n" +
			`for ${firstVar} in servers\n` +
			`   entity = @{${firstVar} + ${firstVar}}\n` +
			"endfor";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("Arithmetic expression with incorrect var", () => {
		const text =
			"list servers = 'srv1', 'srv2'\n" +
			`for ${firstVar} in servers\n` +
			`   entity = @{${secondVar} + ${firstVar}}\n` +
			"endfor";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 2, character: 14 }, end: { line: 2, character: 14 + secondVar.length } } },
			DiagnosticSeverity.Error, `${secondVar} is used in loop, but wasn't declared`
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});
});
