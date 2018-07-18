import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity, TextDocument } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import * as Functions from "../validateFunctions";

suite("Warn about setting interpreted as a tag", () => {

    test("Is not double-quoted", () => {
        const text =
            "[tags]\n" +
            "	starttime = 20 second\n" +
            "	startime = 30 minute\n";
        const document: TextDocument = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                uri: document.uri, range: {
                    end: { line: 1, character: "	".length + "starttime".length},
                    start: { line: 1, character: "	".length }
                }
            },
            DiagnosticSeverity.Information, "starttime is interpreted as a tag"
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Is double-quoted", () => {
        const text =
            "[tags]\n" +
            '	"starttime" = 20 second\n' +
            "	startime = 30 minute\n";
        const document: TextDocument = Shared.createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Is upper-case with dash", () => {
        const text =
            "[tags]\n" +
            "	stArt-time = 20 second\n" +
            "	startime = 30 minute\n";
        const document: TextDocument = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                uri: document.uri, range: {
                    end: { line: 1, character: "	".length + "stArt-time".length},
                    start: { line: 1, character: "	".length }
                }
            },
            DiagnosticSeverity.Information, "starttime is interpreted as a tag"
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

});
