import { DiagnosticSeverity } from "vscode-languageserver";
import { createDiagnostic } from "../util";
import { Test } from "./test";

suite("Unmatched endfor tests", () => {
    const tests: Test[] = [
        new Test(
            "One correct loop",
            `list servers = 'srv1', 'srv2'
for server in servers
   do something
endfor`,
            [],
        ),
        new Test(
            "Two correct loops",
            `list servers = 'srv1', 'srv2'
for server in servers
   do something
endfor
for server in servers
   do something
endfor`,
            [],
        ),
        new Test(
            "One incorrect loop",
            `list servers = 'srv1', 'srv2'
for server in servers
   do something`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 3, line: 1 },
                        start: { character: 0, line: 1 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "for has no matching endfor",
            )],
        ),
        new Test(
            "Two incorrect loops",
            `list servers = 'srv1', 'srv2'
for server in servers
   do something
for srv in servers
   do something`,
            [
                createDiagnostic(
                    {
                        range: {
                            end: { character: 3, line: 1 },
                            start: { character: 0, line: 1 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, "for has no matching endfor",
                ),
                createDiagnostic(
                    {
                        range: {
                            end: { character: 3, line: 3 },
                            start: { character: 0, line: 3 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, "for has no matching endfor",
                )],
        ),
        new Test(
            "One incorrect loop, one correct loop",
            `list servers = 'srv1', 'srv2'
for server in servers
   do something
for srv in servers
   do something
endfor`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 3, line: 1 },
                        start: { character: 0, line: 1 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "for has no matching endfor",
            )],
        ),
    ];

    tests.forEach((test: Test) => { test.validationTest(); });

});
