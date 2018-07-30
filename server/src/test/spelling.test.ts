import { DiagnosticSeverity } from "vscode-languageserver/lib/main";
import Util from "../Util";
import Test from "./Test";

suite("Spelling checks", () => {
    const tests = [
        new Test("starttime",
            "[configuration]\n" +
            "	start-time = 15 second\n" +
            "	starttime = 20 second\n" +
            "	startime = 30 minute\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 9, line: 3 },
                        start: { character: 1, line: 3 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("startime", "starttime"),
            )],
        ),
        new Test("section eries",
            "[eries]\n" +
            "	starttime = 20 second\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 6, line: 0 },
                        start: { character: 1, line: 0 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("eries", "series"),
            )],
        ),
        new Test("section starttime",
            "[starttime]\n" +
            "	starttime = 20 second\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: 10, line: 0 },
                        start: { character: 1, line: 0 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("starttime", "series"),
            )],
        ),
        new Test("tags ignored",
            "[tags]\n" +
            "	startime = 20 second\n",
            [],
        ),
        new Test("tags ignoring finished with new section",
            "[tags]\n" +
            "	startime = 20 second\n" +
            "[starttime]\n" +
            "	startime = 20 second\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "[".length + "starttime".length, line: 2 },
                        start: { character: "[".length, line: 2 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("starttime", "series"),
            ), Util.createDiagnostic(
                {
                    range: {
                        end: { character: "	".length + "startime".length, line: 3 },
                        start: { character: "	".length, line: 3 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("startime", "starttime"),
            )],
        ),
        new Test("tags ignoring finished with whitespace",
            "[tags]\n" +
            "	startime = 20 second\n" +
            "\n" +
            "startime = 20 second\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "startime".length, line: 3 },
                        start: { character: 0, line: 3 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("startime", "starttime"),
            )],
        ),
    ];

    tests.forEach(Test.VALIDATION_TEST);

});
