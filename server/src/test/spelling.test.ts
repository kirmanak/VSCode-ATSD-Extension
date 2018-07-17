import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity, TextDocument } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import * as Functions from "../validateFunctions";

suite("Spelling checks", () => {

    test("starttime", () => {
        const text =
            "[series]\n" +
            "	start-time = 15 second\n" +
            "	starttime = 20 second\n" +
            "	startime = 30 minute\n";
        const document: TextDocument = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                uri: document.uri, range: {
                    start: { line: 3, character: 1 },
                    end: { line: 3, character: 9 }
                }
            },
            DiagnosticSeverity.Error, Shared.errorMessage("startime", "starttime")
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("section eries", () => {
        const text =
            "[eries]\n" +
            "	starttime = 20 second\n";
        const document: TextDocument = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                uri: document.uri, range: {
                    start: { line: 0, character: 1 },
                    end: { line: 0, character: 6 }
                }
            },
            DiagnosticSeverity.Error, Shared.errorMessage("eries", "series")
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("section starttime", () => {
        const text =
            "[starttime]\n" +
            "	starttime = 20 second\n";
        const document: TextDocument = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                uri: document.uri, range: {
                    start: { line: 0, character: 1 },
                    end: { line: 0, character: 10 }
                }
            },
            DiagnosticSeverity.Error, Shared.errorMessage("starttime", "series")
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("tags ignored", () => {
        const text =
            "[tags]\n" +
            "	startime = 20 second\n";
        const document: TextDocument = Shared.createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("tags ignoring finished with new section", () => {
        const text =
            "[tags]\n" +
            "	startime = 20 second\n" +
            "[starttime]\n" +
            "	startime = 20 second\n";
        const document: TextDocument = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                uri: document.uri, range: {
                    end: { line: 2, character: "[".length + "starttime".length },
                    start: { line: 2, character: "[".length }
                }
            },
            DiagnosticSeverity.Error, Shared.errorMessage("starttime", "series")
        ), Shared.createDiagnostic(
            {
                uri: document.uri, range: {
                    end: { line: 3, character: "	".length + "startime".length },
                    start: { line: 3, character: "	".length }
                }
            },
            DiagnosticSeverity.Error, Shared.errorMessage("startime", "starttime")
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("tags ignoring finished with whitespace", () => {
        const text =
            "[tags]\n" +
            "	startime = 20 second\n" +
            "\n" +
            "startime = 20 second\n";
        const document: TextDocument = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                uri: document.uri, range: {
                    end: { line: 3, character: "startime".length },
                    start: { line: 3, character: 0 }
                }
            },
            DiagnosticSeverity.Error, Shared.errorMessage("startime", "starttime")
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

});
