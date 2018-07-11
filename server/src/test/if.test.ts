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
			"list servers = 'srv1', 'srv2'\n" +
			"for server in servers\n" +
			"  [series]\n" +
			"    entity = @{server}\n" +
			"    if server == 'srv1'\n" +
			"      color = red\n" +
			"    elseif server == 'srv2'\n" +
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
			"list servers = 'srv1', 'srv2'\n" +
			"for server in servers\n" +
			"  [series]\n" +
			"    entity = @{server}\n" +
			"    if server == 'srv1'\n" +
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
			"list servers = 'srv1', 'srv2'\n" +
			"for server in servers\n" +
			"  [series]\n" +
			"    entity = @{server}\n" +
			"    elseif server == 'srv1'\n" +
			"      color = yellow\n" +
			"    endif\n" +
			"endfor\n";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 4, character: 4 }, end: { line: 4, character: 10 } } },
			DiagnosticSeverity.Error, elseIfError
		), Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 6, character: 4 }, end: { line: 6, character: 9 } } },
			DiagnosticSeverity.Error, endIfError
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One incorrect else-endif", () => {
		const text =
			"list servers = 'srv1', 'srv2'\n" +
			"for server in servers\n" +
			"  [series]\n" +
			"    entity = @{server}\n" +
			"    else\n" +
			"      color = yellow\n" +
			"    endif\n" +
			"endfor\n";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 4, character: 4 }, end: { line: 4, character: 8 } } },
			DiagnosticSeverity.Error, elseError
		), Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 6, character: 4 }, end: { line: 6, character: 9 } } },
			DiagnosticSeverity.Error, endIfError
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One incorrect else-endif with comment", () => {
		const text =
			"list servers = 'srv1', 'srv2'\n" +
			"for server in servers\n" +
			"  [series]\n" +
			"    entity = @{server}\n" +
			"    /* this is a comment */ else\n" +
			"      color = yellow\n" +
			"    endif /* a comment */ # too\n" +
			"endfor\n";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 4, character: 28 }, end: { line: 4, character: 32 } } },
			DiagnosticSeverity.Error, elseError
		), Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 6, character: 4 }, end: { line: 6, character: 9 } } },
			DiagnosticSeverity.Error, endIfError
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One incorrect if-else", () => {
		const text =
			"list servers = 'srv1', 'srv2'\n" +
			"for server in servers\n" +
			"  [series]\n" +
			"    entity = @{server}\n" +
			"    if server == 'srv1'\n" +
			"      color = red\n" +
			"    else\n" +
			"      color = yellow\n" +
			"endfor\n";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 8, character: 0 }, end: { line: 8, character: 6 } } },
			DiagnosticSeverity.Error, "for has finished before if"
		),Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 4, character: 4 }, end: { line: 4, character: 6 } } },
			DiagnosticSeverity.Error, ifError
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

});
