import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity, TextDocument } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import Validator from "../Validator";

suite("Spelling checks", () => {

    test("starttime", () => {
        const text =
            "[configuration]\n" +
            "	start-time = 15 second\n" +
            "	starttime = 20 second\n" +
            "	startime = 30 minute\n";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 9, line: 3 },
                    start: { character: 1, line: 3 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage("startime", "starttime"),
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("section eries", () => {
        const text =
            "[eries]\n" +
            "	starttime = 20 second\n";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 6, line: 0 },
                    start: { character: 1, line: 0 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage("eries", "series"),
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("section starttime", () => {
        const text =
            "[starttime]\n" +
            "	starttime = 20 second\n";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 10, line: 0 },
                    start: { character: 1, line: 0 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage("starttime", "series"),
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("tags ignored", () => {
        const text =
            "[tags]\n" +
            "	startime = 20 second\n";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("tags ignoring finished with new section", () => {
        const text =
            "[tags]\n" +
            "	startime = 20 second\n" +
            "[starttime]\n" +
            "	startime = 20 second\n";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "[".length + "starttime".length, line: 2 },
                    start: { character: "[".length, line: 2 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage("starttime", "series"),
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { character: "	".length + "startime".length, line: 3 },
                    start: { character: "	".length, line: 3 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage("startime", "starttime"),
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("tags ignoring finished with whitespace", () => {
        const text =
            "[tags]\n" +
            "	startime = 20 second\n" +
            "\n" +
            "startime = 20 second\n";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "startime".length, line: 3 },
                    start: { character: 0, line: 3 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage("startime", "starttime"),
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

});
