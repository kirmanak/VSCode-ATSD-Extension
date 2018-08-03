import { DiagnosticSeverity } from "vscode-languageserver";
import { createDiagnostic } from "../util";
import { Test } from "./test";

suite("Warn about setting interpreted as a tag", () => {
    const tests: Test[] = [
        new Test(
            "Is not double-quoted",
            `[tags]
	starttime = 20 second
	startime = 30 minute`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "	".length + "starttime".length, line: 1 },
                        start: { character: "	".length, line: 1 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Information, "starttime is interpreted as a tag",
            )],
        ),
        new Test(
            "Is double-quoted",
            `[tags]
	"starttime" = 20 second
	startime = 30 minute`,
            [],
        ),
        new Test(
            "Is upper-case with dash",
            `[tags]
	stArt-time = 20 second
	startime = 30 minute`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "	".length + "stArt-time".length, line: 1 },
                        start: { character: "	".length, line: 1 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Information, "starttime is interpreted as a tag",
            )],
        ),
    ];

    tests.forEach((test: Test) => { test.validationTest(); });

});
