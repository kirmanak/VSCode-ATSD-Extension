import { DiagnosticSeverity } from "vscode-languageserver/lib/main";
import Util from "../Util";
import Test from "./Test";

const elseIfError = "elseif has no matching if";
const elseError = "else has no matching if";
const endIfError = "endif has no matching if";
const ifError = "if has no matching endif";

suite("If elseif else endif validation tests", () => {
    const tests = [
        new Test("One correct if-elseif-endif",
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "  [series]\n" +
            "    metric = temp\n" +
            "    entity = @{server}\n" +
            "    if server == 'srv1'\n" +
            "      color = red\n" +
            "    elseif server == 'srv2'\n" +
            "      color = yellow\n" +
            "    endif\n" +
            "endfor\n",
            [],
        ),
        new Test("One correct if-else-endif",
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "  [series]\n" +
            "    metric = temp\n" +
            "    entity = @{server}\n" +
            "    if server == 'srv1'\n" +
            "      color = red\n" +
            "    else\n" +
            "      color = yellow\n" +
            "    endif\n" +
            "endfor\n",
            [],
        ),
        new Test("One incorrect elseif-endif",
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "  [series]\n" +
            "    metric = temp\n" +
            "    entity = @{server}\n" +
            "    elseif server == 'srv1'\n" +
            "      color = yellow\n" +
            "    endif\n" +
            "endfor\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 10, line: 5 },
                        start: { character: 4, line: 5 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, elseIfError,
            ), Util.createDiagnostic(
                {
                    range: {
                        end: { character: 9, line: 7 },
                        start: { character: 4, line: 7 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, endIfError,
            )],
        ),
        new Test("One incorrect else-endif",
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "  [series]\n" +
            "    metric = temp\n" +
            "    entity = @{server}\n" +
            "    else\n" +
            "      color = yellow\n" +
            "    endif\n" +
            "endfor\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 8, line: 5 },
                        start: { character: 4, line: 5 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, elseError,
            ), Util.createDiagnostic(
                {
                    range: {
                        end: { character: 9, line: 7 },
                        start: { character: 4, line: 7 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, endIfError,
            )],
        ),
        new Test("One incorrect else-endif with comment",
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "  [series]\n" +
            "    metric = temp\n" +
            "    entity = @{server}\n" +
            "    /* this is a comment */ else\n" +
            "      color = yellow\n" +
            "    endif /* a comment */ # too\n" +
            "endfor\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 32, line: 5 },
                        start: { character: 28, line: 5 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, elseError,
            ), Util.createDiagnostic(
                {
                    range: {
                        end: { character: 9, line: 7 },
                        start: { character: 4, line: 7 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, endIfError,
            )],
        ),
        new Test("One incorrect if-else",
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "  [series]\n" +
            "    metric = temp\n" +
            "    entity = @{server}\n" +
            "    if server == 'srv1'\n" +
            "      color = red\n" +
            "    else\n" +
            "      color = yellow\n" +
            "endfor\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 6, line: 9 },
                        start: { character: 0, line: 9 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, "for has finished before if",
            ), Util.createDiagnostic(
                {
                    range: {
                        end: { character: 6, line: 5 },
                        start: { character: 4, line: 5 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, ifError,
            )],
        ),

    ];

    tests.forEach(Test.VALIDATION_TEST);

});
