import { DiagnosticSeverity } from "vscode-languageserver/lib/main";
import Util from "../Util";
import Test from "./Test";

suite("for in ... tests", () => {
    const tests = [
        new Test("Correct one-line list, correct for",
            "list servers = 'srv1', 'srv2'\n" +
            "for srv in servers\n" +
            "   #do something\n" +
            "endfor\n",
            [],
        ),
        new Test("Correct one-line list, incorrect for",
            "list servers = 'srv1', 'srv2'\n" +
            "for srv in server\n" +
            "   #do something\n" +
            "endfor\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 17, line: 1 },
                        start: { character: 11, line: 1 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("server", "servers"),
            )],
        ),
        new Test("Correct one-line var(array), incorrect for",
            "var servers = ['srv1', 'srv2']\n" +
            "for srv in server\n" +
            "   #do something\n" +
            "endfor\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 17, line: 1 },
                        start: { character: 11, line: 1 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("server", "servers"),
            )],
        ),
        new Test("Correct one-line var(array), correct for",
            "var servers = ['srv1', 'srv2']\n" +
            "for srv in servers\n" +
            "   #do something\n" +
            "endfor\n",
            [],
        ),
        new Test("Correct one-line var(props), incorrect for",
            "var servers = {'srv1': 'srv2'}\n" +
            "for srv in server\n" +
            "   #do something\n" +
            "endfor\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 17, line: 1 },
                        start: { character: 11, line: 1 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("server", "servers"),
            )],
        ),
        new Test("Correct one-line var(props), correct for",
            "var servers = {'srv1': 'srv2'}\n" +
            "for srv in servers\n" +
            "   #do something\n" +
            "endfor\n",
            [],
        ),
        new Test("Correct multi-line list, correct for",
            "list servers = 'srv1', \n" +
            "   'srv2'\n" +
            "endlist\n" +
            "for srv in servers\n" +
            "   #do something\n" +
            "endfor\n",
            [],
        ),
        new Test("Correct multi-line list, incorrect for",
            "list servers = 'srv1', \n" +
            "   'srv2'\n" +
            "endlist\n" +
            "for srv in server\n" +
            "   #do something\n" +
            "endfor\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 17, line: 3 },
                        start: { character: 11, line: 3 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("server", "servers"),
            )],
        ),
        new Test("Correct multi-line var(array), incorrect for",
            "var servers = ['srv1', \n" +
            "   'srv2'\n" +
            "]\n" +
            "endvar\n" +
            "for srv in server\n" +
            "   #do something\n" +
            "endfor\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 17, line: 4 },
                        start: { character: 11, line: 4 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("server", "servers"),
            )],
        ),
        new Test("Correct multi-line var(array), correct for",
            "var servers = ['srv1', \n" +
            "   'srv2'\n" +
            "]\n" +
            "endvar\n" +
            "for srv in servers\n" +
            "   #do something\n" +
            "endfor\n",
            [],
        ),
        new Test("Correct multi-line var(props), incorrect for",
            "var servers = {\n" +
            "   'srv1': 'srv2'\n" +
            "}\n" +
            "endvar\n" +
            "for srv in server\n" +
            "   #do something\n" +
            "endfor\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 17, line: 4 },
                        start: { character: 11, line: 4 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("server", "servers"),
            )],
        ),
        new Test("Correct multi-line var(props), correct for",
            "var servers = {\n" +
            "   'srv1': 'srv2'\n" +
            "}\n" +
            "endvar\n" +
            "for srv in servers\n" +
            "   #do something\n" +
            "endfor\n",
            [],
        ),
        new Test("Correct multi-line var(props), correct for before var",
            "for srv in servers\n" +
            "   #do something\n" +
            "endfor\n" +
            "var servers = {\n" +
            "   'srv1': 'srv2'\n" +
            "}\n" +
            "endvar\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 18, line: 0 },
                        start: { character: 11, line: 0 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("servers", null),
            )],
        ),
        new Test("Undeclared var, correct for before var",
            "for srv in servers\n" +
            "   #do something\n" +
            "endfor\n" +
            "var servers = {\n" +
            "   'srv1': 'srv2'\n" +
            "}\n" +
            "endvar\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 18, line: 0 },
                        start: { character: 11, line: 0 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("servers", null),
            )],
        ),
        new Test("Undeclared var, incorrect for with empty in",
            "for srv in \n" +
            "   #do something\n" +
            "endfor\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 12, line: 0 },
                        start: { character: 11, line: 0 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, "Empty 'in' statement",
            )],
        ),
    ];

    tests.forEach(Test.RUN_TEST);

});
