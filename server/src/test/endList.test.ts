import { TextDocument, Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';
import * as Shared from '../sharedFunctions';

const errorMessage = "list has no matching endlist";

suite("Unfinished list", () => {

	test("One correct oneline list", () => {
		const text =
			'list servers = vps, vds\n';
		const document: TextDocument = Shared.createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One correct multiline list", () => {
		const text =
			'list servers = vps, \n' +
			'	vds\n' +
			'endlist';
		const document: TextDocument = Shared.createDoc(text);
		const expected: Diagnostic[] = [];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One incorrect multiline list", () => {
		const text =
			'list servers = vps, \n' +
			'	vds\n' +
			'edlist';
		const document: TextDocument = Shared.createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 0, character: 0 }, end: {line: 0, character: 4 } } },
			DiagnosticSeverity.Error, errorMessage
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One incorrect multiline list with comment before", () => {
		const text =
			'/* this is\n' +
			'a comment\n' +
			'to check correct range */\n' +
			'\n' +
			'list servers = vps, \n' +
			'	vds\n' +
			'edlist';
		const document: TextDocument = Shared.createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 4, character: 0 }, end: {line: 4, character: 4 } } },
			DiagnosticSeverity.Error, errorMessage
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One incorrect multiline list with comment on the line", () => {
		const text =
			'/* test */ list servers = vps, \n' +
			'	vds\n' +
			'edlist';
		const document: TextDocument = Shared.createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 0, character: 11 }, end: {line: 0, character: 15 } } },
			DiagnosticSeverity.Error, errorMessage
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);
	});

	test("One incorrect multiline list with comments", () => {
		const text =
			'/* this is\n' +
			'a comment\n' +
			'to check correct range */\n' +
			'\n' +
			'/* test */ list servers = vps, \n' +
			'	vds\n' +
			'edlist';
		const document: TextDocument = Shared.createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 4, character: 11 }, end: {line: 4, character: 15 } } },
			DiagnosticSeverity.Error, errorMessage
		)];
		const result = Functions.lineByLine(document);
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
		const document: TextDocument = Shared.createDoc(text);
		const expected: Diagnostic[] = [Shared.createDiagnostic(
			{ uri: document.uri, range: { start: { line: 3, character: 0 }, end: {line: 3, character: 4 } } },
			DiagnosticSeverity.Error, errorMessage
		)];
		const result = Functions.lineByLine(document);
		assert.deepEqual(result, expected);

	});

});
