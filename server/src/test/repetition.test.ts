import { DiagnosticSeverity } from "vscode-languageserver/lib/main";
import Util from "../Util";
import Test from "./Test";

suite("Repetition of variables or settings tests", () => {
    const tests = [
        new Test("Repetition of var name in 'var' and 'list'",
            "list servers = 'srv1', 'srv2'\n" +
            "var servers = 'srv1', 'srv2'\n",
            [Util.createDiagnostic(
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
        new Test("Repetition of var name in 'for' and 'list'",
            "list servers = 'srv1', 'srv2'\n" +
            "for servers in servers\n" +
            "endfor",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "for ".length + "servers".length, line: 1 },
                        start: { character: "for ".length, line: 1 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, "servers is already defined",
            )],
        ),
        new Test("Repetition of var name in 'csv' and 'list'",
            "list servers = 'srv1', 'srv2'\n" +
            "csv servers = vps, vds\n" +
            "   true, false\n" +
            "endcsv",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "csv ".length + "servers".length, line: 1 },
                        start: { character: "csv ".length, line: 1 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, "servers is already defined",
            )],
        ),
        new Test("Repetition of var name in 'list' and 'csv'",
            "csv servers = vps, vds\n" +
            "   true, false\n" +
            "endcsv\n" +
            "list servers = 'srv1', 'srv2'",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "list ".length + "servers".length, line: 3 },
                        start: { character: "list ".length, line: 3 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, "servers is already defined",
            )],
        ),
        new Test("Repetition of var name in 'for' and 'var'",
            "list servers = 'srv1', 'srv2'\n" +
            "for srv in servers\n" +
            "endfor\n" +
            "var srv = ['srv1', 'srv2']",
            [],
        ),
        new Test("Repetition of setting name",
            "[series]\n" +
            "   entity = srv\n" +
            "   entity = srv2\n" +
            "   metric = status",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "   ".length + "entity".length, line: 2 },
                        start: { character: "   ".length, line: 2 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Warning, "entity is already defined",
            )],
        ),
        new Test("Shadowing of a setting from parent section",
            "[configuration]\n" +
            "   entity = srv\n" +
            "[series]\n" +
            "   entity = srv2\n" +
            "   metric = status",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "   ".length + "entity".length, line: 3 },
                        start: { character: "   ".length, line: 3 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Hint, "entity is already defined",
            )],
        ),
        new Test("Repetition of aliases",
            "[series]\n" +
            "   entity = srv\n" +
            "   metric = temp\n" +
            "   alias = server\n" +
            "[series]\n" +
            "   entity = srv\n" +
            "   metric = temp\n" +
            "   alias = server",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "   alias = ".length + "server".length, line: 7 },
                        start: { character: "   alias = ".length, line: 7 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, "server is already defined",
            )],
        ),
        new Test("Repetition of aliases in different widgets",
            "[widget]\n" +
            "   type = chart\n" +
            "[series]\n" +
            "   entity = srv\n" +
            "   metric = temp\n" +
            "   alias = server\n" +
            "[widget]\n" +
            "   type = chart\n" +
            "[series]\n" +
            "   entity = srv\n" +
            "   metric = temp\n" +
            "   alias = server",
            [],
        ),
        new Test("Same name for alias and list",
            "list server = 'srv1', 'srv2'\n" +
            "[series]\n" +
            "   entity = srv\n" +
            "   metric = temp\n" +
            "   alias = server",
            [],
        ),
        new Test("Repetition of declared settings in if",
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       entity = srv\n" +
            "       metric = temp\n" +
            "       color = 'yellow'\n" +
            "       if server = 'srv1'\n" +
            "           color = 'red'\n" +
            "       else\n" +
            "           color = 'green'\n" +
            "       endif\n" +
            "endfor\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "           ".length + "color".length, line: 7 },
                        start: { character: "           ".length, line: 7 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Warning, "color is already defined",
            ), Util.createDiagnostic(
                {
                    range: {
                        end: { character: "           ".length + "color".length, line: 9 },
                        start: { character: "           ".length, line: 9 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Warning, "color is already defined",
            )],
        ),
        new Test("Repetition of declared in parent settings in if",
            "[widget]\n" +
            "   type = chart\n" +
            "   entity = srv\n" +
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       metric = temp\n" +
            "       if server = 'srv1'\n" +
            "           entity = srv2\n" +
            "       else\n" +
            "           entity = srv1\n" +
            "       endif\n" +
            "endfor\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "           ".length + "entity".length, line: 8 },
                        start: { character: "           ".length, line: 8 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Hint, "entity is already defined",
            ), Util.createDiagnostic(
                {
                    range: {
                        end: { character: "           ".length + "entity".length, line: 10 },
                        start: { character: "           ".length, line: 10 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Hint, "entity is already defined",
            )],
        ),
        new Test("Repetition of settings in if then",
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       entity = srv\n" +
            "       metric = temp\n" +
            "       if server = 'srv1'\n" +
            "           color = 'yellow'\n" +
            "           color = 'red'\n" +
            "       else\n" +
            "           color = 'green'\n" +
            "       endif\n" +
            "endfor\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "           ".length + "color".length, line: 7 },
                        start: { character: "           ".length, line: 7 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Warning, "color is already defined",
            )],
        ),
        new Test("Repetition of settings in if else",
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       entity = srv\n" +
            "       metric = temp\n" +
            "       if server = 'srv1'\n" +
            "           color = 'yellow'\n" +
            "       else\n" +
            "           color = 'red'\n" +
            "           color = 'green'\n" +
            "       endif\n" +
            "endfor\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "           ".length + "color".length, line: 9 },
                        start: { character: "           ".length, line: 9 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Warning, "color is already defined",
            )],
        ),
        new Test("Repetition of settings in if elseif",
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       entity = srv\n" +
            "       metric = temp\n" +
            "       if server = 'srv1'\n" +
            "           color = 'yellow'\n" +
            "       elseif server = 'srv2'\n" +
            "           color = 'black'\n" +
            "       else\n" +
            "           color = 'red'\n" +
            "           color = 'green'\n" +
            "       endif\n" +
            "endfor\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "           ".length + "color".length, line: 11 },
                        start: { character: "           ".length, line: 11 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Warning, "color is already defined",
            )],
        ),
        new Test("Repetition of settings in if else next section",
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       entity = srv\n" +
            "       metric = temp\n" +
            "       if server = 'srv1'\n" +
            "           color = 'yellow'\n" +
            "       elseif server = 'srv2'\n" +
            "           color = 'black'\n" +
            "       else\n" +
            "           color = 'green'\n" +
            "       endif\n" +
            "   [series]\n" +
            "       entity = srv\n" +
            "       metric = temp\n" +
            "       if server = 'srv1'\n" +
            "           color = 'yellow'\n" +
            "       else\n" +
            "           color = 'green'\n" +
            "       endif\n" +
            "endfor\n",
            [],
        ),
        new Test("Repetition of settings in if else next section without if",
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       entity = srv\n" +
            "       metric = temp\n" +
            "       if server = 'srv1'\n" +
            "           color = 'yellow'\n" +
            "       elseif server = 'srv2'\n" +
            "           color = 'black'\n" +
            "       else\n" +
            "           color = 'green'\n" +
            "       endif\n" +
            "   [series]\n" +
            "       entity = srv\n" +
            "       metric = temp\n" +
            "       color = 'yellow'\n" +
            "endfor\n",
            [],
        ),
    ];

    tests.forEach(Test.VALIDATION_TEST);

});
