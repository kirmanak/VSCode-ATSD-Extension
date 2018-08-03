import { DiagnosticSeverity } from "vscode-languageserver";
import { createDiagnostic } from "../util";
import { Test } from "./test";

suite("CSV tests", () => {
    const tests: Test[] = [
        new Test(
            "Correct inline csv(header next line)",
            `csv countries =
   name, value1, value2
   Russia, 65, 63
   USA, 63, 63
endcsv`,
            [],
        ),
        new Test(
            "Correct inline csv (header this line)",
            `csv countries = name, value1, value2
   Russia, 65, 63
   USA, 63, 63
endcsv`,
            [],
        ),
        new Test(
            "Unclosed csv (header this line)",
            `csv countries = name, value1, value2
   Russia, 65, 63
   USA, 63, 63
encsv`,
            [
                createDiagnostic(
                    {
                        range: {
                            end: { character: 5, line: 3 },
                            start: { character: 0, line: 3 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, "Expected 3 columns, but found 1",
                ),
                createDiagnostic(
                    {
                        range: {
                            end: { character: 3, line: 0 }, start: { character: 0, line: 0 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, "csv has no matching endcsv",
                )],
        ),
        new Test(
            "Unclosed csv (header next line)",
            `csv countries =
   name, value1, value2
   Russia, 65, 63
   USA, 63, 63
encsv`,
            [
                createDiagnostic(
                    {
                        range: {
                            end: { character: 5, line: 4 },
                            start: { character: 0, line: 4 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, "Expected 3 columns, but found 1",
                ),
                createDiagnostic(
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
            `csv countries = name, value1, value2
   Russia, 65, 63
   USA, 63, 63, 63
endcsv`,
            [createDiagnostic(
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
            `csv countries = name, value1, value2
   Russia, "6,5", 63
   USA, 63, "6 3"
endcsv`,
            [],
        ),
    ];

    tests.forEach((test: Test) => { test.validationTest(); });

});
