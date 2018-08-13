import { DiagnosticSeverity, Position, Range } from "vscode-languageserver";
import { createDiagnostic } from "../util";
import { Test } from "./test";

const errorMessage: string = "script has no matching endscript";

suite("Script endscript tests", () => {
    const tests: Test[] = [
        new Test(
            "Correct empty script",
            `script
endscript`,
            [],
        ),
        new Test(
            "Unclosed empty script",
            `script
endscrpt`,
            [createDiagnostic(
                Range.create(Position.create(0, 0), Position.create(0, "script".length)),
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
        new Test(
            "Script with unclosed for",
            `script
	for (let i = 0, i < 5, i+) {}
endscript`,
            [],
        ),
        new Test(
            "Two correct scripts",
            `script
	for (let i = 0, i < 5, i+) {}
endscript
script
	for (let i = 0, i < 5, i+) {}
endscript`,
            [],
        ),
        new Test(
            "Two unclosed scripts",
            `script
endscrpt
script
endscrpt`,
            [createDiagnostic(
                Range.create(Position.create(0, 0), Position.create(0, "script".length)),
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
        new Test(
            "Correct one-line script = ",
            "script = if (!config.isDialog) c = widget",
            [],
        ),
        new Test(
            "Correct multi-line script = ",
            `script = if

		(!config.isDialog)
			c = widget
endscript`,
            [],
        ),
        new Test(
            "Unfinished one-line script = ",
            "script = ",
            [createDiagnostic(
                Range.create(Position.create(0, 0), Position.create(0, "script".length)),
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
        new Test(
            "Correct empty one-line script = ",
            `script =
endscript`,
            [],
        ),
        new Test(
            "Incorrect multi-line script = ",
            `script = if

		(!config.isDialog)
			c = widget
endscript`,
            [],
        ),
    ];

    tests.forEach((test: Test) => { test.validationTest(); });

});
