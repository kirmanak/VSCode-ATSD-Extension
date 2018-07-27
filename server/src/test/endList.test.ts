import { DiagnosticSeverity } from "vscode-languageserver/lib/main";
import Util from "../Util";
import Test from "./Test";

const errorMessage = "list has no matching endlist";

suite("Unfinished list", () => {
    const tests = [
        new Test("One correct oneline list",
            "list servers = vps, vds\n",
            [],
        ),
        new Test("One correct multiline list",
            "list servers = vps, \n" +
            "	vds\n" +
            "endlist",
            [],
        ),
        new Test("One incorrect multiline list",
            "list servers = vps, \n" +
            "	vds\n" +
            "edlist",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 4, line: 0 },
                        start: { character: 0, line: 0 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
        new Test("One incorrect multiline list with comment before",
            "/* this is\n" +
            "a comment\n" +
            "to check correct range */\n" +
            "\n" +
            "list servers = vps, \n" +
            "	vds\n" +
            "edlist",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 4, line: 4 },
                        start: { character: 0, line: 4 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
        new Test("One incorrect multiline list with comment on the line",
            "/* test */ list servers = vps, \n" +
            "	vds\n" +
            "edlist",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 15, line: 0 },
                        start: { character: 11, line: 0 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
        new Test("One incorrect multiline list with comments",
            "/* this is\n" +
            "a comment\n" +
            "to check correct range */\n" +
            "\n" +
            "/* test */ list servers = vps, \n" +
            "	vds\n" +
            "edlist",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 15, line: 4 },
                        start: { character: 11, line: 4 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
        new Test("Three lists, one incorrect",
            "list servers1 = vps, \n" +
            "	vds\n" +
            "endlist\n" +
            "list servers2 = vps, \n" +
            "	vds\n" +
            "edlist\n" +
            "list servers3 = vps, \n" +
            "	vds\n" +
            "endlist\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 4, line: 3 },
                        start: { character: 0, line: 3 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
        new Test("Correct multiline list, comma on next line",
            "list servers = vps\n" +
            "	,vds\n" +
            "endlist",
            [],
        ),
        new Test("Incorrect multiline list, comma on next line",
            "list servers = vps\n" +
            "	,vds\n" +
            "edlist",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 4, line: 0 },
                        start: { character: 0, line: 0 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, errorMessage,
            )],
        ),
    ];

    tests.forEach(Test.RUN_TEST);

});
