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
                    end: { line: 0, character: "[".length + "series".length },
                    start: { line: 0, character: "[".length },
                },
                uri: document.uri,
            },
            DiagnosticSeverity.Error, "entity is required",
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("correct series with parent section", () => {
        const text =
            "[widget]\n" +
            "   type = chart\n" +
            "   entity = hello\n" +
            "   [series]\n" +
            "       metric = hello\n";
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("correct series with grandparent section", () => {
        const text =
            "[group]\n" +
            "   entity = hello\n" +
            "[widget]\n" +
            "   type = chart\n" +
            "   [series]\n" +
            "       metric = hello\n";
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("incorrect series with closed parent section", () => {
        const text =
            "[group]\n" +
            "   type = chart\n" +
            "   [widget]\n" +
            "       entity = hello\n" +
            "       [series]\n" +
            "           metric = hello\n" +
            "\n" +
            "   [widget]\n" +
            "       [series]\n" +
            "           metric = hello\n";
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 8, character: "       [".length + "series".length },
                    start: { line: 8, character: "       [".length },
                },
                uri: document.uri,
            },
            DiagnosticSeverity.Error, "entity is required",
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("two incorrect series without parent categories", () => {
        const text =
            "[series]\n" +
            "   metric = hello\n" +
            "[series]\n" +
            "   entity = hello\n";
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 0, character: "[".length + "series".length },
                    start: { line: 0, character: "[".length },
                },
                uri: document.uri,
            },
            DiagnosticSeverity.Error, "entity is required",
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { line: 2, character: "[".length + "series".length },
                    start: { line: 2, character: "[".length },
                },
                uri: document.uri,
            },
            DiagnosticSeverity.Error, "metric is required",
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });
});
