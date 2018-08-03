import { DiagnosticSeverity } from "vscode-languageserver";
import { createDiagnostic, errorMessage } from "../util";
import { Test } from "./test";

suite("for in ... tests", () => {
    const tests: Test[] = [
        new Test(
            "Correct one-line list, correct for",
            `list servers = 'srv1', 'srv2'
for srv in servers
   #do something
endfor`,
            [],
        ),
        new Test(
            "Correct one-line list, incorrect for",
            `list servers = 'srv1', 'srv2'
for srv in server
   #do something
endfor`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 17, line: 1 },
                        start: { character: 11, line: 1 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage("server", "servers"),
            )],
        ),
        new Test(
            "Correct one-line var(array), incorrect for",
            `var servers = ['srv1', 'srv2']
for srv in server
   #do something
endfor`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 17, line: 1 },
                        start: { character: 11, line: 1 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage("server", "servers"),
            )],
        ),
        new Test(
            "Correct one-line var(array), correct for",
            `var servers = ['srv1', 'srv2']
for srv in servers
   #do something
endfor`,
            [],
        ),
        new Test(
            "Correct one-line var(props), incorrect for",
            `var servers = {'srv1': 'srv2'}
for srv in server
   #do something
endfor`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 17, line: 1 },
                        start: { character: 11, line: 1 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage("server", "servers"),
            )],
        ),
        new Test(
            "Correct one-line var(props), correct for",
            `var servers = {'srv1': 'srv2'}
for srv in servers
   #do something
endfor`,
            [],
        ),
        new Test(
            "Correct multi-line list, correct for",
            `list servers = 'srv1',
   'srv2'
endlist
for srv in servers
   #do something
endfor`,
            [],
        ),
        new Test(
            "Correct multi-line list, incorrect for",
            `list servers = 'srv1',
   'srv2'
endlist
for srv in server
   #do something
endfor`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 17, line: 3 },
                        start: { character: 11, line: 3 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage("server", "servers"),
            )],
        ),
        new Test(
            "Correct multi-line var(array), incorrect for",
            `var servers = ['srv1',
   'srv2'
]
endvar
for srv in server
   #do something
endfor`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 17, line: 4 },
                        start: { character: 11, line: 4 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage("server", "servers"),
            )],
        ),
        new Test(
            "Correct multi-line var(array), correct for",
            `var servers = ['srv1',
   'srv2'
]
endvar
for srv in servers
   #do something
endfor`,
            [],
        ),
        new Test(
            "Correct multi-line var(props), incorrect for",
            `var servers = {
   'srv1': 'srv2'
}
endvar
for srv in server
   #do something
endfor`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 17, line: 4 },
                        start: { character: 11, line: 4 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage("server", "servers"),
            )],
        ),
        new Test(
            "Correct multi-line var(props), correct for",
            `var servers = {
   'srv1': 'srv2'
}
endvar
for srv in servers
   #do something
endfor`,
            [],
        ),
        new Test(
            "Correct multi-line var(props), correct for before var",
            `for srv in servers
   #do something
endfor
var servers = {
   'srv1': 'srv2'
}
endvar`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 18, line: 0 },
                        start: { character: 11, line: 0 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage("servers", undefined),
            )],
        ),
        new Test(
            "Undeclared var, correct for before var",
            `for srv in servers
   #do something
endfor
var servers = {
   'srv1': 'srv2'
}
endvar`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 18, line: 0 },
                        start: { character: 11, line: 0 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage("servers", undefined),
            )],
        ),
        new Test(
            "Undeclared var, incorrect for with empty in",
            `for srv in
   #do something
endfor`,
            [createDiagnostic(
                {
                    range: {
                        end: { character: 12, line: 0 },
                        start: { character: 11, line: 0 },
                    },
                    uri: Test.URI,
                },
                DiagnosticSeverity.Error, "Empty 'in' statement",
            )],
        ),
    ];

    tests.forEach((test: Test) => { test.validationTest(); });

});
