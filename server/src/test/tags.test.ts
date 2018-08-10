import { DiagnosticSeverity } from "vscode-languageserver";
import { createDiagnostic } from "../util";
import { Test } from "./test";

const errorMessage: (setting: string) => string = (setting: string): string => `${setting} is interpreted as a` +
    " series tag and is sent to the server. Remove the setting from the [tags] section or enclose it" +
    " double-quotes to suppress the warning.";

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
                DiagnosticSeverity.Information, errorMessage("starttime"),
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
                DiagnosticSeverity.Information, errorMessage("start-time"),
            )],
        ),
    ];

    tests.forEach((test: Test) => { test.validationTest(); });

});
