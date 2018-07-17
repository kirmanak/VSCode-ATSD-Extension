import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import * as Functions from "../validateFunctions";

suite("Required settings for sections tests", () => {

    test("correct series without parent section", () => {
        const text =
            "[series]\n" +
            "   entity = hello\n" +
            "   metric = hello\n";
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("incorrect series without parent categories", () => {
        const text =
            "[series]\n" +
            "   metric = hello\n";
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 0, character: "[series]".length },
                    start: { line: 0, character: 0 }
                },
                uri: document.uri
            },
            DiagnosticSeverity.Error, "entity is required"
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("correct series with parent section", () => {
        const text =
            "[configuration]\n" +
            "   entity = hello\n" +
            "\n" +
            "   [series]\n" +
            "       metric = hello\n";
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

});
