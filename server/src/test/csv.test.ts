import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import Validator from "../Validator";
import Test from "./Test";

suite("CSV tests", () => {
    const tests = [
        new Test(
            "Correct inline csv(header next line)",
            "csv countries = \n" +
            "   name, value1, value2\n" +
            "   Russia, 65, 63\n" +
            "   USA, 63, 63\n" +
            "endcsv",
            [],
        ),
        new Test(
            "Correct inline csv (header this line)",
            "csv countries = name, value1, value2\n" +
            "   Russia, 65, 63\n" +
            "   USA, 63, 63\n" +
            "endcsv",
            [],
        ),
        new Test(
            "Unclosed csv (header this line)",
            "csv countries = name, value1, value2\n" +
            "   Russia, 65, 63\n" +
            "   USA, 63, 63\n" +
            "encsv",
            [Shared.createDiagnostic(
                {
                    range: {
                        end: { character: 5, line: 3 },
                        start: { character: 0, line: 3 },
                    },
                    uri: document.uri,
                },
                DiagnosticSeverity.Error, "Expected 3 columns, but found 1",
            ), Shared.createDiagnostic(
                {
                    range: {
                        end: { character: 3, line: 0 }, start: { character: 0, line: 0 },
                    }, uri: document.uri,
                },
                DiagnosticSeverity.Error, "csv has no matching endcsv",
            )],
        ),
    ];

    tests.forEach((data) => {
        test(data.getName(), () => {
            assert.deepEqual(new Validator(Shared.createDoc(data.getText())).lineByLine(), data.getExpected());
        });
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
                    end: { character: 5, line: 4 },
                    start: { character: 0, line: 4 },
                },
                uri: document.uri,
            },
            DiagnosticSeverity.Error, "Expected 3 columns, but found 1",
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { character: 3, line: 0 },
                    start: { character: 0, line: 0 },
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
                    end: { character: 18, line: 2 },
                    start: { character: 0, line: 2 },
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
