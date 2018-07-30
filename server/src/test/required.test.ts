import { DiagnosticSeverity } from "vscode-languageserver/lib/main";
import Util from "../Util";
import Test from "./Test";

suite("Required settings for sections tests", () => {
    const tests = [
        new Test("correct series without parent section",
            "[series]\n" +
            "   entity = hello\n" +
            "   metric = hello\n",
            [],
        ),
        new Test("incorrect series without parent categories",
            "[series]\n" +
            "   metric = hello\n",
            [Util.createDiagnostic(
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
        new Test("correct series with parent section",
            "[widget]\n" +
            "   type = chart\n" +
            "   entity = hello\n" +
            "   [series]\n" +
            "       metric = hello\n",
            [],
        ),
        new Test("correct series with grandparent section",
            "[group]\n" +
            "   entity = hello\n" +
            "[widget]\n" +
            "   type = chart\n" +
            "   [series]\n" +
            "       metric = hello\n",
            [],
        ),
        new Test("correct series with greatgrandparent section",
            "[configuration]\n" +
            "   entity = hello\n" +
            "[group]\n" +
            "[widget]\n" +
            "   type = chart\n" +
            "   [series]\n" +
            "       metric = hello\n",
            [],
        ),
        new Test("correct series with greatgrandparent section and empty line",
            "[configuration]\n" +
            "\n" +
            "   entity = hello\n" +
            "[group]\n" +
            "[widget]\n" +
            "   type = chart\n" +
            "   [series]\n" +
            "       metric = hello\n",
            [],
        ),
        new Test("incorrect series with closed parent section",
            "[group]\n" +
            "   type = chart\n" +
            "   [widget]\n" +
            "       entity = hello\n" +
            "       [series]\n" +
            "           metric = hello\n" +
            "\n" +
            "   [widget]\n" +
            "       [series]\n" +
            "           metric = hello\n",
            [Util.createDiagnostic(
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
        new Test("two incorrect series without parent categories",
            "[series]\n" +
            "   metric = hello\n" +
            "[series]\n" +
            "   entity = hello\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "[".length + "series".length, line: 0 },
                        start: { character: "[".length, line: 0 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "entity is required",
            ), Util.createDiagnostic(
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
        new Test("A setting is specified in if statement",
            "list servers = vps, vds\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       metric = cpu_busy\n" +
            "       if server == 'vps'\n" +
            "           entity = vds\n" +
            "       else\n" +
            "           entity = vps\n" +
            "       endif\n" +
            "endfor\n",
            [],
        ),
        new Test("A setting is specified only in if-elseif statements",
            "list servers = vps, vds\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       metric = cpu_busy\n" +
            "       if server == 'vps'\n" +
            "           entity = vds\n" +
            "       elseif server = 'vds'\n" +
            "           entity = vps\n" +
            "       endif\n" +
            "endfor\n",
            [Util.createDiagnostic(
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

    tests.forEach(Test.VALIDATION_TEST);

});
