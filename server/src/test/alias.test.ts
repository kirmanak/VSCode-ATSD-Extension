import { TextDocument, Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';
import * as Shared from '../sharedFunctions';

function createDoc(text: string): TextDocument {
	return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

suite("Incorrect dealias tests", () => {

	test("One alias, one correct dealias", () => {
		const text =
			"alias = s1\n" +
			"value = value('s1') * 2";
		const document = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.nonExistentAliases(document);
		assert.deepEqual(result, expected);
	});

	test("One alias, one incorrect dealias", () => {
		const text =
			"alias = s1\n" +
			"value = value('s2') * 2";
		const document = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 1, character: 15 }, end: { line: 1, character: 17 } } },
			DiagnosticSeverity.Error, "The alias s2 is reffered, but never declared"
		)];
		const result = Functions.nonExistentAliases(document);
		assert.deepEqual(result, expected);
	});



	test("One alias, one correct dealias before the declaration", () => {
		const text =
			"value = value('s1') * 2\n" +
			"alias = s1";
		const document = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 0, character: 15}, end: { line: 0, character: 17} } },
			DiagnosticSeverity.Error, "The alias s1 is reffered, but never declared"
		)];
		const result = Functions.nonExistentAliases(document);
		assert.deepEqual(result, expected);
	});

	test("One alias, two incorrect dealiases", () => {
		const text =
			"alias = s1\n" +
			"value = value('s2') * 2\n" +
			"value = value('s3') * 2";
		const document = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 1, character: 15 }, end: { line: 1, character: 17 } } },
			DiagnosticSeverity.Error, "The alias s2 is reffered, but never declared"
		), Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 2, character: 15 }, end: { line: 2, character: 17 } } },
			DiagnosticSeverity.Error, "The alias s3 is reffered, but never declared"
		)];
		const result = Functions.nonExistentAliases(document);
		assert.deepEqual(result, expected);
	});

	test("Two aliases, two correct dealiases", () => {
		const text =
			"alias = s1\n" +
			"alias = s2\n" +
			"value = value('s1') * 2\n" + 
			"value = value('s2') * 2";
		const document = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.nonExistentAliases(document);
		assert.deepEqual(result, expected);
	});

	test("Two aliases, one incorrect dealias. one correct dealias", () => {
		const text =
			"alias = s1\n" +
			"alias = s2\n" +
			"value = value('s3') * 2\n" + 
			"value = value('s2') * 2";
		const document = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 2, character: 15}, end: { line: 2, character: 17} } },
			DiagnosticSeverity.Error, "The alias s3 is reffered, but never declared"
		)];
		const result = Functions.nonExistentAliases(document);
		assert.deepEqual(result, expected);
	});

	test("Declared series, indents are used, correct alias and dealias", () => {
		const text = 
			"[series]\n" +
			"	alias = src\n"
			"[series]\n" + 
			"	value = value('src');\n";
		const document = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.nonExistentAliases(document);
		assert.deepEqual(result, expected);
	})
});
