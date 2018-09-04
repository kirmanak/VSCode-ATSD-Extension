import { DiagnosticSeverity, Range } from "vscode-languageserver";
import { createDiagnostic, errorMessage } from "../util";
import { Test } from "./test";

suite("FreeMarker unknown variables", () => {
    const tests: Test[] = [
        new Test(
            "Correct usage",
            `<#assign lpars = [
   ["abc:KUX","abc"]
  ,["cde:KUX","cde"]
]>

<#list lpars as lpar>

[group]
[widget]
    type = gauge
    title = \${lpar[1]}`,
            [
                createDiagnostic(
                    Range.create(0, 0, 0, "<#assign".length),
                    DiagnosticSeverity.Information,
                    "Freemarker expressions are deprecated. Use a native collection: list, csv table, var object.",
                ),
                createDiagnostic(
                    Range.create(5, 0, 5, "<#list".length),
                    DiagnosticSeverity.Information,
                    "Freemarker expressions are deprecated. Use a native collection: list, csv table, var object.",
                ),
            ],
        ),
        new Test(
            "Undeclared entity usage",
            `<#assign lpars = [
   ["abc:KUX","abc"]
  ,["cde:KUX","cde"]
]>

<#list lpars as lpar>

[group]
[widget]
    type = gauge
    title = \${entity}`,
            [
                createDiagnostic(
                    Range.create(0, 0, 0, "<#assign".length),
                    DiagnosticSeverity.Information,
                    "Freemarker expressions are deprecated. Use a native collection: list, csv table, var object.",
                ),
                createDiagnostic(
                    Range.create(5, 0, 5, "<#list".length),
                    DiagnosticSeverity.Information,
                    "Freemarker expressions are deprecated. Use a native collection: list, csv table, var object.",
                ),
            ],
        ),
        new Test(
            "Misspelt variable name",
            `<#assign lpars = [
   ["abc:KUX","abc"]
  ,["cde:KUX","cde"]
]>

<#list lpars as lpar>

[group]
[widget]
    type = gauge
    title = \${lbar[1]}`,
            [
                createDiagnostic(
                    Range.create(0, 0, 0, "<#assign".length),
                    DiagnosticSeverity.Information,
                    "Freemarker expressions are deprecated. Use a native collection: list, csv table, var object.",
                ),
                createDiagnostic(
                    Range.create(5, 0, 5, "<#list".length),
                    DiagnosticSeverity.Information,
                    "Freemarker expressions are deprecated. Use a native collection: list, csv table, var object.",
                ),
                createDiagnostic(
                    Range.create(10, "    title = \${".length, 10, "    title = \${".length + "lbar".length),
                    DiagnosticSeverity.Error,
                    errorMessage("lbar", "lpar"),
                ),
            ],
        ),
        new Test(
            "Misspelt array name",
            `<#assign lpars = [
   ["abc:KUX","abc"]
  ,["cde:KUX","cde"]
]>

<#list lbars as lpar>

[group]
[widget]
    type = gauge
    title = \${lpar[1]}`,
            [
                createDiagnostic(
                    Range.create(0, 0, 0, "<#assign".length),
                    DiagnosticSeverity.Information,
                    "Freemarker expressions are deprecated. Use a native collection: list, csv table, var object.",
                ),
                createDiagnostic(
                    Range.create(5, 0, 5, "<#list".length),
                    DiagnosticSeverity.Information,
                    "Freemarker expressions are deprecated. Use a native collection: list, csv table, var object.",
                ),
                createDiagnostic(
                    Range.create(5, "<#list ".length, 5, "<#list ".length + "lbars".length),
                    DiagnosticSeverity.Error,
                    errorMessage("lbars", "lpars"),
                ),
            ],
        ),
    ];

    for (const test of tests) {
        test.validationTest();
    }
});
