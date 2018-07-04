import { TextDocument, Diagnostic, Location, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';

function createDoc(text: string): TextDocument {
	return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

function createDiagnostic(location: Location, misspelling: string, suggestion: string): Diagnostic {
	const diagnostic: Diagnostic = {
		severity: DiagnosticSeverity.Warning,
		range: location.range,
		message: `${misspelling} is unknown`,
		source: diagnosticSource,
		relatedInformation: []
	};
	diagnostic.relatedInformation.push({
		location: location,
		message: `${misspelling} is unknown. Did you mean ${suggestion}?`
	});
	return diagnostic;
}

const diagnosticSource = "Axibase Visual Plugin";
suite("Spelling checks", () => {

	test("starttime", () => {
		const text =
			"[series]\n" +
			"	start-time = 15 second\n" + 
			"	starttime = 20 second\n" +
			"	startime = 30 minute\n";
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [
			createDiagnostic({ 
				uri: document.uri, 
				range: { start: { line: 2, character: 1}, end: { line: 2, character: 10} }
			}, "starttime", "start-time"), 
			createDiagnostic({
				uri: document.uri, 
				range: { start: { line: 3, character: 1}, end: { line: 3, character: 9} }
			}, "startime", "start-time") 
		];
		const result = Functions.spellingCheck(document, true);
		assert.deepEqual(result, expected);
	});

});
