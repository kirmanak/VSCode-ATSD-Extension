import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';
import * as Shared from '../sharedFunctions';

suite("Incorrect dealias tests", () => {

	test("One alias, one correct dealias", () => {
		const text =
			"alias = s1\n" +
			"value = value('s1') * 2";
		const document = Shared.createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One alias, one incorrect dealias", () => {
		const text =
			"alias = s1\n" +
			"value = value('s2') * 2";
		const document = Shared.createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{
				uri: document.uri, range: {
					start: { line: 1, character: 15 },
					end: { line: 1, character: 17 }
				}
			},
			DiagnosticSeverity.Error, Shared.errorMessage("s2", "s1")
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One alias, one correct dealias before the declaration", () => {
		const text =
			"value = value('s1') * 2\n" +
			"alias = s1";
		const document = Shared.createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One alias, two incorrect dealiases", () => {
		const text =
			"alias = s1\n" +
			"value = value('s2') * 2\n" +
			"value = value('s3') * 2";
		const document = Shared.createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{
				uri: document.uri,
				range: {
					start: { line: 1, character: 15 },
					end: { line: 1, character: 17 }
				}
			},
			DiagnosticSeverity.Error, Shared.errorMessage("s2", "s1")
		), Shared.createDiagnostic(
			{
				uri: document.uri,
				range: {
					start: { line: 2, character: 15 },
					end: { line: 2, character: 17 }
				}
			},
			DiagnosticSeverity.Error, Shared.errorMessage("s3", "s1")
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("Two aliases, two correct dealiases", () => {
		const text =
			"alias = s1\n" +
			"alias = s2\n" +
			"value = value('s1') * 2\n" +
			"value = value('s2') * 2";
		const document = Shared.createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("Two aliases, one incorrect dealias. one correct dealias", () => {
		const text =
			"alias = s1\n" +
			"alias = s2\n" +
			"value = value('s3') * 2\n" +
			"value = value('s2') * 2";
		const document = Shared.createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{
				uri: document.uri,
				range: {
					start: { line: 2, character: 15 },
					end: { line: 2, character: 17 }
				}
			},
			DiagnosticSeverity.Error, Shared.errorMessage("s3", "s1")
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("Declared series, indents are used, correct alias and dealias", () => {
		const text =
			"[series]\n" +
			"	alias = src\n"
		"[series]\n" +
			"	value = value('src');\n";
		const document = Shared.createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

});
