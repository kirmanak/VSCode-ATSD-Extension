import { DiagnosticSeverity } from "vscode-languageserver";
import { createDiagnostic } from "../util";
import { Test } from "./test";

suite("Required settings for sections tests", () => {
    const tests: Test[] = [
        new Test(
            "correct series without parent section",
            `[series]
   entity = hello
   metric = hello`,
            [],
        ),
        new Test(
            "incorrect series without parent categories",
            `[series]
   metric = hello`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "[".length + "series".length, line: 0 },
                        start: { character: "[".length, line: 0 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "entity is required",
            )],
        ),
        new Test(
            "correct series with parent section",
            `[widget]
   type = chart
   entity = hello
   [series]
       metric = hello`,
            [],
        ),
        new Test(
            "correct series with grandparent section",
            `[group]
   entity = hello
[widget]
   type = chart
   [series]
       metric = hello`,
            [],
        ),
        new Test(
            "correct series with greatgrandparent section",
            `[configuration]
   entity = hello
[group]
[widget]
   type = chart
   [series]
       metric = hello`,
            [],
        ),
        new Test(
            "correct series with greatgrandparent section and empty line",
            `[configuration]

   entity = hello
[group]
[widget]
   type = chart
   [series]
       metric = hello`,
            [],
        ),
        new Test(
            "incorrect series with closed parent section",
            `[group]
   type = chart
   [widget]
       entity = hello
       [series]
           metric = hello

   [widget]
       [series]
           metric = hello`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "       [".length + "series".length, line: 8 },
                        start: { character: "       [".length, line: 8 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "entity is required",
            )],
        ),
        new Test(
            "two incorrect series without parent categories",
            `[series]
   metric = hello
[series]
   entity = hello`,
            [
                createDiagnostic(
                    {
                        range: {
                            end: { character: "[".length + "series".length, line: 0 },
                            start: { character: "[".length, line: 0 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, "entity is required",
                ),
                createDiagnostic(
                    {
                        range: {
                            end: { character: "[".length + "series".length, line: 2 },
                            start: { character: "[".length, line: 2 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, "metric is required",
                )],
        ),
        new Test(
            "A setting is specified in if statement",
            `list servers = vps, vds
for server in servers
   [series]
       metric = cpu_busy
       if server == 'vps'
           entity = vds
       else
           entity = vps
       endif
endfor`,
            [],
        ),
        new Test(
            "A setting is specified only in if-elseif statements",
            `list servers = vps, vds
for server in servers
   [series]
       metric = cpu_busy
       if server == 'vps'
           entity = vds
       elseif server = 'vds'
           entity = vps
       endif
endfor`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "   [".length + "series".length, line: 2 },
                        start: { character: "   [".length, line: 2 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "entity is required",
            )],
        ),
    ];

    tests.forEach((test: Test) => { test.validationTest(); });

});
