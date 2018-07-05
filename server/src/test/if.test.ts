import { TextDocument, Diagnostic, Location, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';

function createDoc(text: string): TextDocument {
	return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

function createDiagnostic(location: Location, message: string, relatedMessage: string): Diagnostic {
	const diagnostic: Diagnostic = {
		severity: DiagnosticSeverity.Error, range: location.range, 
		message: message, source: diagnosticSource,
	};
	diagnostic.relatedInformation = [{
		location: location, message: relatedMessage
	}];
	return diagnostic;
}

const diagnosticSource = "Axibase Visual Plugin";
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
		const expected: Diagnostic[] = [createDiagnostic(
			{ uri: document.uri, range: { start: { line: 3, character: 4 }, end: { line: 3, character: 10 } } }, 
			`"elseif" has no matching "if"`, `"elseif" requires a previously declared "if"`
		), createDiagnostic(
			{ uri: document.uri, range: { start: { line: 5, character: 4 }, end: { line: 5, character: 9 } } }, 
			`"endif" has no matching "if"`, `"endif" requires a previously declared "if"`
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
		const expected: Diagnostic[] = [createDiagnostic(
			{ uri: document.uri, range: { start: { line: 3, character: 4 }, end: { line: 3, character: 8 } } }, 
			`"else" has no matching "if"`, `"else" requires a previously declared "if"`
		), createDiagnostic(
			{ uri: document.uri, range: { start: { line: 5, character: 4 }, end: { line: 5, character: 9 } } }, 
			`"endif" has no matching "if"`, `"endif" requires a previously declared "if"`
		)];
		const result = Functions.ifValidation(document, true);
		assert.deepEqual(result, expected);
	});


});
