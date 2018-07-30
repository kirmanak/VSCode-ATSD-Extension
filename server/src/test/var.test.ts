import { DiagnosticSeverity } from "vscode-languageserver/lib/main";
import Util from "../Util";
import Test from "./Test";

suite("Var endvar tests", () => {
    const tests = [
        new Test("Correct oneline var array",
            "var v = [[9,3], [9,4]]",
            [],
        ),
        new Test("Correct oneline var props",
            `var v = { "hello": "value", "array": ["val", "value"]}`,
            [],
        ),
        new Test("Correct multiline var props",
            `var v = {\n` +
            `   "hello": "value", \n` +
            `   "array": ["val", "value"]\n` +
            `}\n` +
            `endvar`,
            [],
        ),
        new Test("Correct multiline var array",
            "var v = [\n" +
            "    [9,3], [9,4]\n" +
            "]\n" +
            "endvar",
            [],
        ),
        new Test("Incorrect multiline var array",
            "var v = [\n" +
            "    [9,3], [9,4]\n" +
            "]\n" +
            "edvar",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 3, line: 0 },
                        start: { character: 0, line: 0 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, "var has no matching endvar",
            )],
        ),
        new Test("Incorrect multiline var props",
            `var v = {\n` +
            `   "hello": "value", \n` +
            `   "array": ["val", "value"]\n` +
            `}\n` +
            `edvar`,
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 3, line: 0 },
                        start: { character: 0, line: 0 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, "var has no matching endvar",
            )],
        ),
        new Test("Incorrect multiline var mixed array of props",
            `var v = [\n` +
            `   { "hello": "value" }, \n` +
            `   { "array": ["val", "value"] }\n` +
            `]\n` +
            `edvar`,
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 3, line: 0 },
                        start: { character: 0, line: 0 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, "var has no matching endvar",
            )],
        ),
        new Test("Correct var function call",
            `var v = getEntities("hello")`,
            [],
        ),
    ];

    tests.forEach(Test.VALIDATION_TEST);

});
