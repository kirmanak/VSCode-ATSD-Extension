import { DiagnosticSeverity } from "vscode-languageserver";
import { createDiagnostic } from "../util";
import Test from "./Test";

suite("Unmatched endfor tests", () => {
    const tests: Test[] = [
        new Test("One correct loop",
                 "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   do something\n" +
            "endfor",
                 [],
        ),
        new Test("Two correct loops",
                 "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   do something\n" +
            "endfor\n" +
            "for server in servers\n" +
            "   do something\n" +
            "endfor",
                 [],
        ),
        new Test("One incorrect loop",
                 "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   do something\n",
                 [createDiagnostic(
                {
                    range: {
                        end: { character: 3, line: 1 },
                        start: { character: 0, line: 1 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, "for has no matching endfor",
            )],
        ),
        new Test("Two incorrect loops",
                 "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   do something\n" +
            "for srv in servers\n" +
            "   do something\n",
                 [createDiagnostic(
                {
                    range: {
                        end: { character: 3, line: 1 },
                        start: { character: 0, line: 1 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, "for has no matching endfor",
            ), createDiagnostic(
                {
                    range: {
                        end: { character: 3, line: 3 },
                        start: { character: 0, line: 3 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, "for has no matching endfor",
            )],
        ),
        new Test("One incorrect loop, one correct loop",
                 "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   do something\n" +
            "for srv in servers\n" +
            "   do something\n" +
            "endfor",
                 [createDiagnostic(
                {
                    range: {
                        end: { character: 3, line: 1 },
                        start: { character: 0, line: 1 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, "for has no matching endfor",
            )],
        ),
    ];

    tests.forEach(Test.VALIDATION_TEST);

});
