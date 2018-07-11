import { TextDocument, Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';
import * as Shared from '../sharedFunctions';

suite("Spelling checks", () => {

	test("starttime", () => {
		const text =
			"[series]\n" +
			"	start-time = 15 second\n" + 
			"	starttime = 20 second\n" +
			"	startime = 30 minute\n";
		const document: TextDocument = Shared.createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 3, character: 1}, end: { line: 3, character: 9} } },
			DiagnosticSeverity.Error, Shared.errorMessage("startime", "starttime")
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

});
