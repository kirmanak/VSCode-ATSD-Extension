import { DiagnosticSeverity } from "vscode-languageserver";
import { createDiagnostic } from "../util";
import { Test } from "./test";

const elseIfError: string = "elseif has no matching if";
const elseError: string = "else has no matching if";
const endIfError: string = "endif has no matching if";
const ifError: string = "if has no matching endif";

suite("If elseif else endif validation tests", () => {
    const tests: Test[] = [
        new Test(
            "One correct if-elseif-endif",
            `list servers = 'srv1', 'srv2'
for server in servers
  [series]
    metric = temp
    entity = @{server}
    if server == 'srv1'
      color = red
    elseif server == 'srv2'
      color = yellow
    endif
endfor`,
            [],
        ),
        new Test(
            "One correct if-else-endif",
            `list servers = 'srv1', 'srv2'
for server in servers
  [series]
    metric = temp
    entity = @{server}
    if server == 'srv1'
      color = red
    else
      color = yellow
    endif
endfor`,
            [],
        ),
        new Test(
            "One incorrect elseif-endif",
            `list servers = 'srv1', 'srv2'
for server in servers
  [series]
    metric = temp
    entity = @{server}
    elseif server == 'srv1'
      color = yellow
    endif
endfor`,
            [
                createDiagnostic(
                    {
                        range: {
                            end: { character: 10, line: 5 },
                            start: { character: 4, line: 5 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, elseIfError,
                ),
                createDiagnostic(
                    {
                        range: {
                            end: { character: 9, line: 7 },
                            start: { character: 4, line: 7 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, endIfError,
                )],
        ),
        new Test(
            "One incorrect else-endif",
            `list servers = 'srv1', 'srv2'
for server in servers
  [series]
    metric = temp
    entity = @{server}
    else
      color = yellow
    endif
endfor`,
            [
                createDiagnostic(
                    {
                        range: {
                            end: { character: 8, line: 5 },
                            start: { character: 4, line: 5 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, elseError,
                ),
                createDiagnostic(
                    {
                        range: {
                            end: { character: 9, line: 7 },
                            start: { character: 4, line: 7 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, endIfError,
                )],
        ),
        new Test(
            "One incorrect else-endif with comment",
            `list servers = 'srv1', 'srv2'
for server in servers
  [series]
    metric = temp
    entity = @{server}
    /* this is a comment */ else
      color = yellow
    endif /* a comment */ # too
endfor`,
            [
                createDiagnostic(
                    {
                        range: {
                            end: { character: 32, line: 5 },
                            start: { character: 28, line: 5 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, elseError,
                ),
                createDiagnostic(
                    {
                        range: {
                            end: { character: 9, line: 7 },
                            start: { character: 4, line: 7 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, endIfError,
                )],
        ),
        new Test(
            "One incorrect if-else",
            `list servers = 'srv1', 'srv2'
for server in servers
  [series]
    metric = temp
    entity = @{server}
    if server == 'srv1'
      color = red
    else
      color = yellow
endfor`,
            [
                createDiagnostic(
                    {
                        range: {
                            end: { character: 6, line: 9 },
                            start: { character: 0, line: 9 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, "for has finished before if",
                ),
                createDiagnostic(
                    {
                        range: {
                            end: { character: 6, line: 5 },
                            start: { character: 4, line: 5 },
                        },
                        uri: Test.URI,
                    },
                    DiagnosticSeverity.Error, ifError,
                )],
        ),

    ];

    tests.forEach((test: Test) => { test.validationTest(); });

});
