/* tslint:disable:no-magic-numbers */
import { DiagnosticSeverity, Position, Range } from "vscode-languageserver";
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
                    Range.create(Position.create(3, 0), Position.create(3, "encsv".length)),
                    DiagnosticSeverity.Error, "Expected 3 columns, but found 1",
                ),
                createDiagnostic(
                    Range.create(Position.create(0, 0), Position.create(0, "csv".length)),
                    DiagnosticSeverity.Error, "csv has no matching endcsv",
                ),
            ],
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
                    Range.create(Position.create(4, 0), Position.create(4, "encsv".length)),
                    DiagnosticSeverity.Error, "Expected 3 columns, but found 1",
                ),
                createDiagnostic(
                    Range.create(Position.create(0, 0), Position.create(0, "csv".length)),
                    DiagnosticSeverity.Error, "csv has no matching endcsv",
                ),
            ],
        ),
        new Test(
            "Incorrect csv",
            `csv countries = name, value1, value2
   Russia, 65, 63
   USA, 63, 63, 63
endcsv`,
            [createDiagnostic(
                Range.create(Position.create(2, 0), Position.create(2, "   Russia, 65, 63\n".length)),
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
