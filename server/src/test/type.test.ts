/* tslint:disable:no-magic-numbers */
import { DiagnosticSeverity, Range } from "vscode-languageserver";
import { createDiagnostic } from "../util";
import { Test } from "./test";

suite("Type check tests", () => {
  const tests: Test[] = [
    new Test(
      "Correct boolean settings",
      `[configuration]
  add-meta = false
[configuration]
  add-meta = no
[configuration]
  add-meta = nO
[configuration]
  add-meta = null
[configuration]
  add-meta = none
[configuration]
  add-meta = 0
[configuration]
  add-meta = off
[configuration]
  add-meta = true
[configuration]
  add-meta = yes
[configuration]
  add-meta = yEs
[configuration]
  add-meta = on
[configuration]
  add-meta = 1
`,
      [],
    ),
    new Test(
      "Incorrect boolean setting",
      `[configuration]
  add-meta = not
[configuration]
  add-meta = false true
[configuration]
  add-meta = OFF 1
`,
      [
        createDiagnostic(
          Range.create(1, "  ".length, 1, "  add-meta".length),
          DiagnosticSeverity.Error, "add-meta type is boolean",
        ),
        createDiagnostic(
          Range.create(3, "  ".length, 3, "  add-meta".length),
          DiagnosticSeverity.Error, "add-meta type is boolean",
        ),
        createDiagnostic(
          Range.create(5, "  ".length, 5, "  add-meta".length),
          DiagnosticSeverity.Error, "add-meta type is boolean",
        ),
      ],
    ),
    new Test(
      "Correct number settings",
      `[configuration]
  arrow-length = 1
[configuration]
  arrow-length = 100000
[configuration]
  arrow-length = -100000
[configuration]
  arrow-length = +100000
[configuration]
  arrow-length = .3
[configuration]
  arrow-length = 0.3
[configuration]
  arrow-length = 0.333333333
[configuration]
  arrow-length = 1000.333333333
`,
      [],
    ),
    new Test(
      "Incorrect number settings",
      `[configuration]
  arrow-length = false
[configuration]
  arrow-length = 5 + 5
[configuration]
  arrow-length = 5+5
[configuration]
  arrow-length = 5.0 + 5
[configuration]
  arrow-length = 5.0+5
[configuration]
  arrow-length = 5 + 5.0
[configuration]
  arrow-length = 5+5.0
[configuration]
  arrow-length = 5 hello
[configuration]
  arrow-length = 5hello
[configuration]
  arrow-length = hello5
[configuration]
  arrow-length = hello 5
`,
      [
        createDiagnostic(
          Range.create(1, "  ".length, 1, "  arrow-length".length),
          DiagnosticSeverity.Error, "arrow-length type is number",
        ),
        createDiagnostic(
          Range.create(3, "  ".length, 3, "  arrow-length".length),
          DiagnosticSeverity.Error, "arrow-length type is number",
        ),
        createDiagnostic(
          Range.create(5, "  ".length, 5, "  arrow-length".length),
          DiagnosticSeverity.Error, "arrow-length type is number",
        ),
        createDiagnostic(
          Range.create(7, "  ".length, 7, "  arrow-length".length),
          DiagnosticSeverity.Error, "arrow-length type is number",
        ),
        createDiagnostic(
          Range.create(9, "  ".length, 9, "  arrow-length".length),
          DiagnosticSeverity.Error, "arrow-length type is number",
        ),
        createDiagnostic(
          Range.create(11, "  ".length, 11, "  arrow-length".length),
          DiagnosticSeverity.Error, "arrow-length type is number",
        ),
        createDiagnostic(
          Range.create(13, "  ".length, 13, "  arrow-length".length),
          DiagnosticSeverity.Error, "arrow-length type is number",
        ),
        createDiagnostic(
          Range.create(15, "  ".length, 15, "  arrow-length".length),
          DiagnosticSeverity.Error, "arrow-length type is number",
        ),
        createDiagnostic(
          Range.create(17, "  ".length, 17, "  arrow-length".length),
          DiagnosticSeverity.Error, "arrow-length type is number",
        ),
        createDiagnostic(
          Range.create(19, "  ".length, 19, "  arrow-length".length),
          DiagnosticSeverity.Error, "arrow-length type is number",
        ),
        createDiagnostic(
          Range.create(21, "  ".length, 21, "  arrow-length".length),
          DiagnosticSeverity.Error, "arrow-length type is number",
        ),
      ],
    ),
  ];

  tests.forEach((test: Test): void => { test.validationTest(); });
});
