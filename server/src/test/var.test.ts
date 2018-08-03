import { DiagnosticSeverity } from "vscode-languageserver";
import { createDiagnostic } from "../util";
import { Test } from "./test";

suite("Var endvar tests", () => {
    const tests: Test[] = [
        new Test(
            "Correct oneline var array",
            "var v = [[9,3], [9,4]]",
            [],
        ),
        new Test(
            "Correct oneline var props",
            'var v = { "hello": "value", "array": ["val", "value"]}',
            [],
        ),
        new Test(
            "Correct multiline var props",
            `var v = {
   "hello": "value",
   "array": ["val", "value"]
}
endvar`,
            [],
        ),
        new Test(
            "Correct multiline var array",
            `var v = [
    [9,3], [9,4]
]
endvar`,
            [],
        ),
        new Test(
            "Incorrect multiline var array",
            `var v = [
    [9,3], [9,4]
]
edvar`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 3, line: 0 },
                        start: { character: 0, line: 0 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "var has no matching endvar",
            )],
        ),
        new Test(
            "Incorrect multiline var props",
            `var v = {
   "hello": "value",
   "array": ["val", "value"]
}
edvar`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 3, line: 0 },
                        start: { character: 0, line: 0 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "var has no matching endvar",
            )],
        ),
        new Test(
            "Incorrect multiline var mixed array of props",
            `var v = [
   { "hello": "value" },
   { "array": ["val", "value"] }
]
edvar`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 3, line: 0 },
                        start: { character: 0, line: 0 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "var has no matching endvar",
            )],
        ),
        new Test(
            "Correct var function call",
            'var v = getEntities("hello")',
            [],
        ),
    ];

    tests.forEach((test: Test) => { test.validationTest(); });

});
