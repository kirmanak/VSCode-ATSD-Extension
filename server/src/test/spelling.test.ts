import { DiagnosticSeverity, Location, Range } from "vscode-languageserver";
import { createDiagnostic, errorMessage } from "../util";
import { Test } from "./test";

suite("Spelling checks", () => {
    const tests: Test[] = [
        new Test(
            "starttime",
            `[configuration]
	start-time = 15 second
	starttime = 20 second
	startime = 30 minute`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 9, line: 3 },
                        start: { character: 1, line: 3 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage("startime", "starttime"),
            )],
        ),
        new Test(
            "section eries",
            `[eries]
	starttime = 20 second`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 6, line: 0 },
                        start: { character: 1, line: 0 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage("eries", "series"),
            )],
        ),
        new Test(
            "section starttime",
            `[starttime]
	starttime = 20 second`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 10, line: 0 },
                        start: { character: 1, line: 0 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage("starttime", "series"),
            )],
        ),
        new Test(
            "tags ignored",
            `[tags]
	startime = 20 second`,
            [],
        ),
        new Test(
            "tags ignoring finished with new section",
            `[tags]
	startime = 20 second
[starttime]
	startime = 20 second`,
            [
                createDiagnostic(
                    {
                        range: {
                            end: { character: "[".length + "starttime".length, line: 2 },
                            start: { character: "[".length, line: 2 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, errorMessage("starttime", "series"),
                ),
                createDiagnostic(
                    {
                        range: {
                            end: { character: "	".length + "startime".length, line: 3 },
                            start: { character: "	".length, line: 3 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, errorMessage("startime", "starttime"),
                )],
        ),
        new Test(
            "tags ignoring finished with whitespace",
            `[series]
  entity = server
  metric = cpu_busy
  [tags]
    startime = 20 second

  startime = 20 second`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "  ".length + "startime".length, line: 6 },
                        start: { character: "  ".length, line: 6 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage("startime", "starttime"),
            )],
        ),
        new Test(
            "Space after section name",
            // tslint:disable-next-line:no-trailing-whitespace
            `[widget] 
type = chart`,
            [],
        ),
        new Test(
            "Space before section name",
            ` [widget]
type = chart`,
            [],
        ),
        new Test(
            "Placeholders section contains valid items  ",
            `url-parameters = ?queryName=EVTNOT&id=\${id}&sd=\${sd}&ed=\${ed}
[placeholders]
  id = none
  sd = 0
  ed = 0`,
            [],
        ),
        new Test(
            "Placeholders section contains invalid items  ",
            `url-parameters = ?queryName=EVTNOT&id=\${id}&sd=\${sd}&ed=\${ed}
[placeholders]
  id = none
  ad = 0
  ed = 0`,
            [createDiagnostic(
                Location.create(
                    Test.URI,
                    Range.create(
                        // tslint:disable-next-line:no-magic-numbers
                        3, "  ".length,
                        // tslint:disable-next-line:no-magic-numbers
                        3, "  ".length + "ad".length,
                    ),
                ),
                DiagnosticSeverity.Error, errorMessage("ad", "add"),
            )],
        ),
    ];

    tests.forEach((test: Test) => { test.validationTest(); });

});
