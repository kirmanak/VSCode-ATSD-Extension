import { TextDocument, Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';
import * as Shared from '../sharedFunctions';

function createDoc(text: string): TextDocument {
	return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

suite("Unmatched endfor tests", () => {

	test("One correct if-elseif-endif", () => {
		const text =
			"for server in servers\n" +
			"  [series]\n" +
			"    entity = @{server}\n" +
			"    if server == 'nurswgvml007'\n" +
			"      color = red\n" +
			"    elseif server == 'nurswgvml006'\n" +
			"      color = yellow\n" +
			"    endif\n" +
			"endfor\n";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.ifValidation(document, true);
		assert.deepEqual(result, expected);
	});

	test("One correct if-else-endif", () => {
		const text =
			"for server in servers\n" +
			"  [series]\n" +
			"    entity = @{server}\n" +
			"    if server == 'nurswgvml007'\n" +
			"      color = red\n" +
			"    else\n" +
			"      color = yellow\n" +
			"    endif\n" +
			"endfor\n";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.ifValidation(document, true);
		assert.deepEqual(result, expected);
	});

	test("One incorrect elseif-endif", () => {
		const text =
			"for server in servers\n" +
			"  [series]\n" +
			"    entity = @{server}\n" +
			"    elseif server == 'nurswgvml006'\n" +
			"      color = yellow\n" +
			"    endif\n" +
			"endfor\n";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 3, character: 4 }, end: { line: 3, character: 10 } } },
			DiagnosticSeverity.Error, '"elseif" has no matching "if"', true
		), Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 5, character: 4 }, end: { line: 5, character: 9 } } },
			DiagnosticSeverity.Error, '"endif" has no matching "if"', true
		)];
		const result = Functions.ifValidation(document, true);
		assert.deepEqual(result, expected);
	});

	test("One correct if-else-endif", () => {
		const text =
			"for server in servers\n" +
			"  [series]\n" +
			"    entity = @{server}\n" +
			"    else\n" +
			"      color = yellow\n" +
			"    endif\n" +
			"endfor\n";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 3, character: 4 }, end: { line: 3, character: 8 } } },
			DiagnosticSeverity.Error, '"else" has no matching "if"', true
		), Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 5, character: 4 }, end: { line: 5, character: 9 } } },
			DiagnosticSeverity.Error, '"endif" has no matching "if"', true
		)];
		const result = Functions.ifValidation(document, true);
		assert.deepEqual(result, expected);
	});


});
