import { TextDocument, Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';
import * as Shared from '../sharedFunctions';

function createDoc(text: string): TextDocument {
	return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

const elseIfError = "elseif has no matching if";
const elseError = "else has no matching if";
const endIfError = "endif has no matching if";
const ifError = "if has no matching endif";

suite("If elseif else endif validation tests", () => {

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
		const result = Functions.lineByLine(document);
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
		const result = Functions.lineByLine(document);
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
			DiagnosticSeverity.Error, elseIfError
		), Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 5, character: 4 }, end: { line: 5, character: 9 } } },
			DiagnosticSeverity.Error, endIfError
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One incorrect else-endif", () => {
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
			DiagnosticSeverity.Error, elseError
		), Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 5, character: 4 }, end: { line: 5, character: 9 } } },
			DiagnosticSeverity.Error, endIfError
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One incorrect else-endif with comment", () => {
		const text =
			"for server in servers\n" +
			"  [series]\n" +
			"    entity = @{server}\n" +
			"    /* this is a comment */ else\n" +
			"      color = yellow\n" +
			"    endif /* a comment */ # too\n" +
			"endfor\n";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 3, character: 28 }, end: { line: 3, character: 32 } } },
			DiagnosticSeverity.Error, elseError
		), Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 5, character: 4 }, end: { line: 5, character: 9 } } },
			DiagnosticSeverity.Error, endIfError
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One incorrect if-else", () => {
		const text =
			"for server in servers\n" +
			"  [series]\n" +
			"    entity = @{server}\n" +
			"    if server == 'nurswgvml007'\n" +
			"      color = red\n" +
			"    else\n" +
			"      color = yellow\n" +
			"endfor\n";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 7, character: 0 }, end: { line: 7, character: 6 } } },
			DiagnosticSeverity.Error, "for has finished before if"
		),Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 3, character: 4 }, end: { line: 3, character: 6 } } },
			DiagnosticSeverity.Error, ifError
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});


});
