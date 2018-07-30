import { DiagnosticSeverity } from "vscode-languageserver/lib/main";
import Util from "../Util";
import Test from "./Test";

suite("Incorrect dealias tests", () => {
    const tests = [
        new Test("One alias, one correct dealias",
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   alias = s1\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s1') * 2",
            [],
        ),
        new Test("One alias, one incorrect dealias",
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   alias = s1\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s2') * 2",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "   value = value('".length + "s2".length, line: 7 },
                        start: { character: "   value = value('".length, line: 7 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("s2", "s1"),
            )],
        ),
        new Test("One alias, one correct dealias before the declaration",
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s1') * 2\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   alias = s1",
            [],
        ),
        new Test("One alias, two incorrect dealiases",
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   alias = s1\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s2') * 2\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s3') * 2",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "   value = value('".length + "s2".length, line: 7 },
                        start: { character: "   value = value('".length, line: 7 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("s2", "s1"),
            ), Util.createDiagnostic(
                {
                    range: {
                        end: { character: "   value = value('".length + "s3".length, line: 11 },
                        start: { character: "   value = value('".length, line: 11 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("s3", "s1"),
            )],
        ),
        new Test("Two aliases, two correct dealiases",
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   alias = s1\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   alias = s2\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s1') * 2\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s2') * 2",
            [],
        ),
        new Test("Two aliases, one incorrect dealias. one correct dealias",
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   alias = s1\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   alias = s2\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s3') * 2\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s2') * 2",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: "   value = value('".length + "s3".length, line: 11 },
                        start: { character: "   value = value('".length, line: 11 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage("s3", "s1"),
            )],
        ),
        new Test("Declared series, indents are used, correct alias and dealias",
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "	alias = src\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "	value = value('src'),\n",
            [],
        ),
    ];

    tests.forEach(Test.VALIDATION_TEST);

});
