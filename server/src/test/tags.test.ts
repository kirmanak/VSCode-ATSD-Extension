import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity, TextDocument } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import * as Functions from "../validateFunctions";

suite("Warn about setting interpreted as a tag", () => {

    test("linebreak", () => {
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

});
