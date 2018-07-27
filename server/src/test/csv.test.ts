import { DiagnosticSeverity } from "vscode-languageserver/lib/main";
import Util from "../Util";
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
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 5, line: 3 },
                        start: { character: 0, line: 3 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "Expected 3 columns, but found 1",
            ), Util.createDiagnostic(
                {
                    range: {
                        end: { character: 3, line: 0 }, start: { character: 0, line: 0 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, "csv has no matching endcsv",
            )],
        ),
        new Test(
            "Unclosed csv (header next line)",
            "csv countries = \n" +
            "   name, value1, value2\n" +
            "   Russia, 65, 63\n" +
            "   USA, 63, 63\n" +
            "encsv",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 5, line: 4 },
                        start: { character: 0, line: 4 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "Expected 3 columns, but found 1",
            ), Util.createDiagnostic(
                {
                    range: {
                        end: { character: 3, line: 0 },
                        start: { character: 0, line: 0 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "csv has no matching endcsv",
            )],
        ),
        new Test(
            "Incorrect csv",
            "csv countries = name, value1, value2\n" +
            "   Russia, 65, 63\n" +
            "   USA, 63, 63, 63\n" +
            "endcsv",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 18, line: 2 },
                        start: { character: 0, line: 2 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "Expected 3 columns, but found 4",
            )],
        ),
        new Test(
            "Correct csv with escaped whitespaces and commas",
            "csv countries = name, value1, value2\n" +
            '   Russia, "6,5", 63\n' +
            '   USA, 63, "6 3"\n' +
            "endcsv",
            [],
        ),
    ];

    tests.forEach(Test.RUN_TEST);

});
