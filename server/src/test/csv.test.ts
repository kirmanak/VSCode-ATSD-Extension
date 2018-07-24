import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import Validator from "../Validator";

suite("CSV tests", () => {

    test("Correct inline csv (header next line)", () => {
        const text =
            "csv countries = \n" +
            "   name, value1, value2\n" +
            "   Russia, 65, 63\n" +
            "   USA, 63, 63\n" +
            "endcsv";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Correct inline csv (header this line)", () => {
        const text =
            "csv countries = name, value1, value2\n" +
            "   Russia, 65, 63\n" +
            "   USA, 63, 63\n" +
            "endcsv";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Unclosed csv (header this line)", () => {
        const text =
            "csv countries = name, value1, value2\n" +
            "   Russia, 65, 63\n" +
            "   USA, 63, 63\n" +
            "encsv";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 3, character: 5 },
                    start: { line: 3, character: 0 },
                },
                uri: document.uri,
            },
            DiagnosticSeverity.Error, "Expected 3 columns, but found 1",
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { line: 0, character: 3 }, start: { line: 0, character: 0 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "csv has no matching endcsv",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Unclosed csv (header next line)", () => {
        const text =
            "csv countries = \n" +
            "   name, value1, value2\n" +
            "   Russia, 65, 63\n" +
            "   USA, 63, 63\n" +
            "encsv";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 4, character: 5 },
                    start: { line: 4, character: 0 },
                },
                uri: document.uri,
            },
            DiagnosticSeverity.Error, "Expected 3 columns, but found 1",
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { line: 0, character: 3 },
                    start: { line: 0, character: 0 },
                },
                uri: document.uri,
            },
            DiagnosticSeverity.Error, "csv has no matching endcsv",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Incorrect csv", () => {
        const text =
            "csv countries = name, value1, value2\n" +
            "   Russia, 65, 63\n" +
            "   USA, 63, 63, 63\n" +
            "endcsv";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 2, character: 18 },
                    start: { line: 2, character: 0 },
                },
                uri: document.uri,
            },
            DiagnosticSeverity.Error, "Expected 3 columns, but found 4",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Correct csv with escaped whitespaces and commas", () => {
        const text =
            "csv countries = name, value1, value2\n" +
            '   Russia, "6,5", 63\n' +
            '   USA, 63, "6 3"\n' +
            "endcsv";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

});
