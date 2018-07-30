import { DiagnosticSeverity } from "vscode-languageserver/lib/main";
import Util from "../Util";
import Test from "./Test";

const errorMessage = "script has no matching endscript";

suite("Script endscript tests", () => {
    const tests = [
        new Test("Correct empty script",
            `script\n` +
            `endscript`,
            [],
        ),
        new Test("Unclosed empty script",
            `script\n` +
            `endscrpt`,
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 6, line: 0 },
                        start: { character: 0, line: 0 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
        new Test("Script with unclosed for",
            `script\n` +
            `	for (let i = 0, i < 5, i++) {}\n` +
            `endscript`,
            [],
        ),
        new Test("Two correct scripts",
            `script\n` +
            `	for (let i = 0, i < 5, i++) {}\n` +
            `endscript\n` +
            `script\n` +
            `	for (let i = 0, i < 5, i++) {}\n` +
            `endscript`,
            [],
        ),
        new Test("Two unclosed scripts",
            `script\n` +
            `endscrpt\n` +
            `script\n` +
            `endscrpt`,
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 6, line: 0 },
                        start: { character: 0, line: 0 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
        new Test("Correct one-line script = ",
            `script = if (!config.isDialog) c = widget`,
            [],
        ),
        new Test("Correct multi-line script = ",
            `script = if \n` +
            `\n` +
            `		(!config.isDialog)\n` +
            `			c = widget\n` +
            `endscript`,
            [],
        ),
        new Test("Unfinished one-line script = ",
            `script = `,
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 6, line: 0 },
                        start: { character: 0, line: 0 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
        new Test("Correct empty one-line script = ",
            `script = \n` +
            `endscript`,
            [],
        ),
        new Test("Incorrect multi-line script = ",
            `script = if \n` +
            `\n` +
            `		(!config.isDialog)\n` +
            `			c = widget\n` +
            `endscript`,
            [],
        ),
    ];

    tests.forEach(Test.VALIDATION_TEST);

});
