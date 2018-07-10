import { TextDocument, Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';
import * as Shared from '../sharedFunctions';

function createDoc(text: string): TextDocument {
    return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

suite("Var endvar tests", () => {

    test("Correct oneline var array", () => {
        const text =
            'var v = [[9,3], [9,4]]';
        const document = createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Correct oneline var props", () => {
        const text =
            `var v = { 'hello': 'value', 'array': ['val', 'value']}`;
        const document = createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Correct multiline var props", () => {
        const text =
            `var v = {\n` +
            `   'hello': 'value', \n` +
            `   'array': ['val', 'value']\n` +
            `}\n` +
            `endvar`;
        const document = createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Correct multiline var array", () => {
        const text =
            'var v = [\n' +
            '    [9,3], [9,4]\n' +
            ']\n' +
            'endvar';
        const document = createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Incorrect multiline var array", () => {
        const text =
            'var v = [\n' +
            '    [9,3], [9,4]\n' +
            ']\n' +
            'edvar';
        const document = createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            { uri: document.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } } },
            DiagnosticSeverity.Error, "var has no matching endvar"
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Incorrect multiline var props", () => {
        const text =
            `var v = {\n` +
            `   'hello': 'value', \n` +
            `   'array': ['val', 'value']\n` +
            `}\n` +
            `edvar`;
        const document = createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            { uri: document.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } } },
            DiagnosticSeverity.Error, "var has no matching endvar"
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Incorrect multiline var mixed array of props", () => {
        const text =
            `var v = [\n` +
            `   { 'hello': 'value' }, \n` +
            `   { 'array': ['val', 'value'] }\n` +
            `]\n` +
            `edvar`;
        const document = createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            { uri: document.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } } },
            DiagnosticSeverity.Error, "var has no matching endvar"
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Correct var function call", () => {
        const text =
            `var v = getEntities('hello')`;
        const document = createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

});
