import { DiagnosticSeverity } from "vscode-languageserver";
import { createDiagnostic, errorMessage } from "../util";
import { Test } from "./test";

suite("Incorrect dealias tests", () => {
    const tests: Test[] = [
        new Test(
            "One alias, one correct dealias",
            `[series]
  metric = temp
  entity = srv
  alias = s1
[series]
  metric = temp
  entity = srv
  value = value('s1') * 2`,
            [],
        ),
        new Test(
            "One alias, one incorrect dealias",
            `[series]
  metric = temp
  entity = srv
  alias = s1
[series]
  metric = temp
  entity = srv
  value = value('s2') * 2`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: "  value = value('".length + "s2".length, line: 7 },
                        start: { character: "  value = value('".length, line: 7 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage("s2", "s1"),
            )],
        ),
        new Test(
            "One alias, one correct dealias before the declaration",
            `[series]
  metric = temp
  entity = srv
  value = value('s1') * 2
[series]
  metric = temp
  entity = srv
  alias = s1`,
            [],
        ),
        new Test(
            "One alias, two incorrect dealiases",
            `[series]
  metric = temp
  entity = srv
  alias = s1
[series]
  metric = temp
  entity = srv
  value = value('s2') * 2
[series]
  metric = temp
  entity = srv
  value = value('s3') * 2`,
            [
                createDiagnostic(
                    {
                        range: {
                            end: { character: "  value = value('".length + "s2".length, line: 7 },
                            start: { character: "  value = value('".length, line: 7 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, errorMessage("s2", "s1"),
                ),
                createDiagnostic(
                    {
                        range: {
                            end: {
                                character: "  value = value('".length + "s3".length, line: 11,
                            },
                            start: {
                                character: "  value = value('".length, line: 11,
                            },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, errorMessage("s3", "s1"),
                )],
        ),
        new Test(
            "Two aliases, two correct dealiases",
            `[series]
  metric = temp
  entity = srv
  alias = s1
[series]
  metric = temp
  entity = srv
  alias = s2
[series]
  metric = temp
  entity = srv
  value = value('s1') * 2
[series]
  metric = temp
  entity = srv
  value = value('s2') * 2`,
            [],
        ),
        new Test(
            "Two aliases, one incorrect dealias. one correct dealias",
            `[series]
  metric = temp
  entity = srv
  alias = s1
[series]
  metric = temp
  entity = srv
  alias = s2
[series]
  metric = temp
  entity = srv
  value = value('s3') * 2
[series]
  metric = temp
  entity = srv
  value = value('s2') * 2`,
            [createDiagnostic(
                {
                    range: {
                        end: {
                            character: "  value = value('".length + "s3".length, line: 11,
                        },
                        start: {
                            character: "  value = value('".length, line: 11,
                        },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage("s3", "s1"),
            )],
        ),
        new Test(
            "Declared series, indents are used, correct alias and dealias",
            `[series]
  metric = temp
  entity = srv
  alias = src
[series]
  metric = temp
  entity = srv
  value = value('src'), \n`,
            [],
        ),
    ];

    tests.forEach((test: Test) => { test.validationTest(); });

});
