import { DiagnosticSeverity } from "vscode-languageserver/lib/main";
import Util from "../Util";
import Test from "./Test";

suite("Warn about setting interpreted as a tag", () => {
    const tests = [
        new Test("Is not double-quoted",
            "[tags]\n" +
            "	starttime = 20 second\n" +
            "	startime = 30 minute\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "	".length + "starttime".length, line: 1 },
                        start: { character: "	".length, line: 1 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Information, "starttime is interpreted as a tag",
            )],
        ),
        new Test("Is double-quoted",
            "[tags]\n" +
            '	"starttime" = 20 second\n' +
            "	startime = 30 minute\n",
            [],
        ),
        new Test("Is upper-case with dash",
            "[tags]\n" +
            "	stArt-time = 20 second\n" +
            "	startime = 30 minute\n",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "	".length + "stArt-time".length, line: 1 },
                        start: { character: "	".length, line: 1 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Information, "starttime is interpreted as a tag",
            )],
        ),
    ];

    tests.forEach(Test.RUN_TEST);

});
