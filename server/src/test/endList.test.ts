import { DiagnosticSeverity } from "vscode-languageserver";
import { createDiagnostic } from "../util";
import { Test } from "./test";

const errorMessage: string = "list has no matching endlist";

suite("Unfinished list", () => {
    const tests: Test[] = [
        new Test(
            "One correct oneline list",
            "list servers = vps, vds",
            [],
        ),
        new Test(
            "One correct multiline list",
            `list servers = vps,
  vds
endlist`,
            [],
        ),
        new Test(
            "One incorrect multiline list",
            `list servers = vps,
	vds
edlist`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 4, line: 0 },
                        start: { character: 0, line: 0 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
        new Test(
            "One incorrect multiline list with comment before",
            `/* this is
a comment
to check correct range */

list servers = vps,
	vds
edlist`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 4, line: 4 },
                        start: { character: 0, line: 4 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
        new Test(
            "One incorrect multiline list with comment on the line",
            `/* test */ list servers = vps,
	vds
edlist`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 15, line: 0 },
                        start: { character: 11, line: 0 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
        new Test(
            "One incorrect multiline list with comments",
            `/* this is
a comment
to check correct range */

/* test */ list servers = vps,
	vds
edlist`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 15, line: 4 },
                        start: { character: 11, line: 4 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
        new Test(
            "Three lists, one incorrect",
            `list servers1 = vps,
	vds
endlist
list servers2 = vps,
	vds
edlist
list servers3 = vps,
	vds
endlist`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 4, line: 3 },
                        start: { character: 0, line: 3 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
        new Test(
            "Correct multiline list, comma on next line",
            `list servers = vps
	,vds
endlist`,
            [],
        ),
        new Test(
            "Incorrect multiline list, comma on next line",
            `list servers = vps
	,vds
edlist`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 4, line: 0 },
                        start: { character: 0, line: 0 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
    ];

    tests.forEach((test: Test) => { test.validationTest(); });

});
