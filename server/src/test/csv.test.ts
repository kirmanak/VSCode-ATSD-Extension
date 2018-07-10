import { TextDocument, Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';
import * as Shared from '../sharedFunctions';

function createDoc(text: string): TextDocument {
    return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

suite("CSV tests", () => {

    test("Correct inline csv (header next line)", () => {
        const text =
            "csv countries = \n" +
            "   name, value1, value2\n" +
            "   Russia, 65, 63\n" +
            "   USA, 63, 63\n" +
            "endcsv";
        const document = createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Correct inline csv (header this line)", () => {
        const text =
            "csv countries = name, value1, value2\n" +
            "   Russia, 65, 63\n" +
            "   USA, 63, 63\n" +
            "endcsv";
        const document = createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Unclosed csv", () => {
        const text =
            "csv countries = name, value1, value2\n" +
            "   Russia, 65, 63\n" +
            "   USA, 63, 63\n" +
            "encsv";
        const document = createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            { uri: document.uri, range: { start: { line: 3, character: 0 }, end: { line: 3, character: 5 } } },
            DiagnosticSeverity.Error, "Expected 3 columns, but found 1"
	), Shared.createDiagnostic(
            { uri: document.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } } },
            DiagnosticSeverity.Error, "csv has no matching endcsv"
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Incorrect csv", () => {
        const text =
            "csv countries = name, value1, value2\n" +
            "   Russia, 65, 63\n" +
            "   USA, 63, 63, 63\n" +
            "endcsv";
        const document = createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            { uri: document.uri, range: { start: { line: 2, character: 0 }, end: { line: 2, character: 18 } } },
            DiagnosticSeverity.Error, "Expected 3 columns, but found 4"
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

});
