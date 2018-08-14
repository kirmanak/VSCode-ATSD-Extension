/* tslint:disable:no-magic-numbers */
import { DiagnosticSeverity, Position, Range } from "vscode-languageserver";
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
                Range.create(Position.create(0, "[".length), Position.create(0, "[".length + "series".length)),
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
                Range.create(Position.create(8, "       [".length), Position.create(8, "       [series".length)),
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
                    Range.create(Position.create(0, "[".length), Position.create(0, "[".length + "series".length)),
                    DiagnosticSeverity.Error, "entity is required",
                ),
                createDiagnostic(
                    Range.create(Position.create(2, "[".length), Position.create(2, "[".length + "series".length)),
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
                Range.create(Position.create(2, "   [".length), Position.create(2, "   [".length + "series".length)),
                DiagnosticSeverity.Error, "entity is required",
            )],
        ),
        new Test(
            "Table without attribute",
            `[series]
  entity = server
  table = cpu_busy`,
            [createDiagnostic(
                Range.create(Position.create(0, "[".length), Position.create(0, "[".length + "series".length)),
                DiagnosticSeverity.Error, "attribute is required",
            )],
        ),
        new Test(
            "Attribute without table",
            `[series]
  entity = server
  attribute = cpu_busy`,
            [createDiagnostic(
                Range.create(Position.create(0, "[".length), Position.create(0, "[".length + "series".length)),
                DiagnosticSeverity.Error, "table is required",
            )],
        ),
        new Test(
            "Derived series",
            `[series]
  entity = server
  metric = cpu_busy
  alias = srv
[series]
  value = value('srv')`,
            [],
        ),
        new Test(
            "Entities instead of entity",
            `[series]
  entities = server
  metric = cpu_busy`,
            [],
        ),
    ];

    tests.forEach((test: Test) => { test.validationTest(); });

});
