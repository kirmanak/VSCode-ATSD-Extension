import { DiagnosticSeverity } from "vscode-languageserver";
import { createDiagnostic } from "../util";
import { Test } from "./test";

suite("Repetition of variables or settings tests", () => {
    const tests: Test[] = [
        new Test(
            "Repetition of var name in 'var' and 'list'",
            `list servers = 'srv1', 'srv2'
var servers = 'srv1', 'srv2'`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "var ".length + "servers".length, line: 1 },
                        start: { character: "var ".length, line: 1 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "servers is already defined",
            )],
        ),
        new Test(
            "Repetition of var name in 'for' and 'list'",
            `list servers = 'srv1', 'srv2'
for servers in servers
endfor`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "for ".length + "servers".length, line: 1 },
                        start: { character: "for ".length, line: 1 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "servers is already defined",
            )],
        ),
        new Test(
            "Repetition of var name in 'csv' and 'list'",
            `list servers = 'srv1', 'srv2'
csv servers = vps, vds
  true, false
endcsv`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "csv ".length + "servers".length, line: 1 },
                        start: { character: "csv ".length, line: 1 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "servers is already defined",
            )],
        ),
        new Test(
            "Repetition of var name in 'list' and 'csv'",
            `csv servers = vps, vds
   true, false
endcsv
list servers = 'srv1', 'srv2'`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "list ".length + "servers".length, line: 3 },
                        start: { character: "list ".length, line: 3 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "servers is already defined",
            )],
        ),
        new Test(
            "Repetition of var name in 'for' and 'var'",
            `list servers = 'srv1', 'srv2'
for srv in servers
endfor
var srv = ['srv1', 'srv2']`,
            [],
        ),
        new Test(
            "Repetition of setting name",
            `[series]
   entity = srv
   entity = srv2
   metric = status`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "   ".length + "entity".length, line: 2 },
                        start: { character: "   ".length, line: 2 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Warning, "entity is already defined",
            )],
        ),
        new Test(
            "Shadowing of a setting from parent section",
            `[configuration]
   entity = srv
[series]
   entity = srv2
   metric = status`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "   ".length + "entity".length, line: 3 },
                        start: { character: "   ".length, line: 3 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Hint, "entity is already defined",
            )],
        ),
        new Test(
            "Repetition of aliases",
            `[series]
   entity = srv
   metric = temp
   alias = server
[series]
   entity = srv
   metric = temp
   alias = server`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "   alias = ".length + "server".length, line: 7 },
                        start: { character: "   alias = ".length, line: 7 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "server is already defined",
            )],
        ),
        new Test(
            "Repetition of aliases in different widgets",
            `[widget]
   type = chart
[series]
   entity = srv
   metric = temp
   alias = server
[widget]
   type = chart
[series]
   entity = srv
   metric = temp
   alias = server`,
            [],
        ),
        new Test(
            "Same name for alias and list",
            `list server = 'srv1', 'srv2'
[series]
   entity = srv
   metric = temp
   alias = server`,
            [],
        ),
        new Test(
            "Repetition of declared settings in if",
            `list servers = 'srv1', 'srv2'
for server in servers
   [series]
       entity = srv
       metric = temp
       color = 'yellow'
       if server = 'srv1'
           color = 'red'
       else
           color = 'green'
       endif
endfor`,
            [
                createDiagnostic(
                    {
                        range: {
                            end: { character: "           ".length + "color".length, line: 7 },
                            start: { character: "           ".length, line: 7 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Warning, "color is already defined",
                ),
                createDiagnostic(
                    {
                        range: {
                            end: { character: "           ".length + "color".length, line: 9 },
                            start: { character: "           ".length, line: 9 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Warning, "color is already defined",
                )],
        ),
        new Test(
            "Repetition of declared in parent settings in if",
            `[widget]
   type = chart
   entity = srv
list servers = 'srv1', 'srv2'
for server in servers
   [series]
       metric = temp
       if server = 'srv1'
           entity = srv2
       else
           entity = srv1
       endif
endfor`,
            [
                createDiagnostic(
                    {
                        range: {
                            end: { character: "           ".length + "entity".length, line: 8 },
                            start: { character: "           ".length, line: 8 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Hint, "entity is already defined",
                ),
                createDiagnostic(
                    {
                        range: {
                            end: { character: "           ".length + "entity".length, line: 10 },
                            start: { character: "           ".length, line: 10 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Hint, "entity is already defined",
                )],
        ),
        new Test(
            "Repetition of settings in if then",
            `list servers = 'srv1', 'srv2'
for server in servers
   [series]
       entity = srv
       metric = temp
       if server = 'srv1'
           color = 'yellow'
           color = 'red'
       else
           color = 'green'
       endif
endfor`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "           ".length + "color".length, line: 7 },
                        start: { character: "           ".length, line: 7 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Warning, "color is already defined",
            )],
        ),
        new Test(
            "Repetition of settings in if else",
            `list servers = 'srv1', 'srv2'
for server in servers
   [series]
       entity = srv
       metric = temp
       if server = 'srv1'
           color = 'yellow'
       else
           color = 'red'
           color = 'green'
       endif
endfor`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "           ".length + "color".length, line: 9 },
                        start: { character: "           ".length, line: 9 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Warning, "color is already defined",
            )],
        ),
        new Test(
            "Repetition of settings in if elseif",
            `list servers = 'srv1', 'srv2'
for server in servers
   [series]
       entity = srv
       metric = temp
       if server = 'srv1'
           color = 'yellow'
       elseif server = 'srv2'
           color = 'black'
       else
           color = 'red'
           color = 'green'
       endif
endfor`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "           ".length + "color".length, line: 11 },
                        start: { character: "           ".length, line: 11 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Warning, "color is already defined",
            )],
        ),
        new Test(
            "Repetition of settings in if else next section",
            `list servers = 'srv1', 'srv2'
for server in servers
   [series]
       entity = srv
       metric = temp
       if server = 'srv1'
           color = 'yellow'
       elseif server = 'srv2'
           color = 'black'
       else
           color = 'green'
       endif
   [series]
       entity = srv
       metric = temp
       if server = 'srv1'
           color = 'yellow'
       else
           color = 'green'
       endif
endfor`,
            [],
        ),
        new Test(
            "Repetition of settings in if else next section without if",
            `list servers = 'srv1', 'srv2'
for server in servers
   [series]
       entity = srv
       metric = temp
       if server = 'srv1'
           color = 'yellow'
       elseif server = 'srv2'
           color = 'black'
       else
           color = 'green'
       endif
   [series]
       entity = srv
       metric = temp
       color = 'yellow'
endfor`,
            [],
        ),
    ];

    tests.forEach((test: Test) => { test.validationTest(); });

});
