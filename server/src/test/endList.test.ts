import { TextDocument, Diagnostic, DiagnosticSeverity, Location } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';

function createDoc(text: string): TextDocument {
	return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

function createDiagnostic(location: Location): Diagnostic {
	const diagnostic: Diagnostic = {
		severity: DiagnosticSeverity.Error,
		range: location.range,
		message: 'list is not closed',
		source: diagnosticSource,
		relatedInformation: []
	};
	diagnostic.relatedInformation.push({
		location: location,
		message: 'Delete comma or add endlist keyword'
	});
	return diagnostic;
}

const diagnosticSource = "Axibase Visual Plugin";
suite("Unfinished list", () => {

	test("One correct oneline list", () => {
		const text =
			'list servers = vps, vds\n';
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.validateUnfinishedList(document, true);
		assert.deepEqual(result, expected);
	});

	test("One correct multiline list", () => {
		const text =
			'list servers = vps, \n' +
			'	vds\n' +
			'endlist';
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.validateUnfinishedList(document, true);
		assert.deepEqual(result, expected);
	});

	test("One incorrect multiline list", () => {
		const text =
			'list servers = vps, \n' +
			'	vds\n' +
			'edlist';
		const document: TextDocument = createDoc(text);
		const expected: Diagnostic[] = [ createDiagnostic({
			range: { start: { line: 0, character: 0 }, end: {line: 0, character: 20 } },
			uri: document.uri
		})];
		const result = Functions.validateUnfinishedList(document, true);
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
		const expected: Diagnostic[] = [ createDiagnostic({
			range: { start: { line: 6, character: 0 }, end: {line: 6, character: 20 } },
			uri: document.uri
		})];
		const result = Functions.validateUnfinishedList(document, true);
		assert.deepEqual(result, expected);

	});

});
