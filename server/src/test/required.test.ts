import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import Validator from "../Validator";

suite("Required settings for sections tests", () => {

    test("correct series without parent section", () => {
        const text =
            "[series]\n" +
            "   entity = hello\n" +
            "   metric = hello\n";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("incorrect series without parent categories", () => {
        const text =
            "[series]\n" +
            "   metric = hello\n";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "[".length + "series".length, line: 0 },
                    start: { character: "[".length, line: 0 },
                },
                uri: document.uri,
            },
            DiagnosticSeverity.Error, "entity is required",
        )];
        const result = validator.lineByLine();
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
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
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
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
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
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "       [".length + "series".length, line: 8 },
                    start: { character: "       [".length, line: 8 },
                },
                uri: document.uri,
            },
            DiagnosticSeverity.Error, "entity is required",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("two incorrect series without parent categories", () => {
        const text =
            "[series]\n" +
            "   metric = hello\n" +
            "[series]\n" +
            "   entity = hello\n";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "[".length + "series".length, line: 0 },
                    start: { character: "[".length, line: 0 },
                },
                uri: document.uri,
            },
            DiagnosticSeverity.Error, "entity is required",
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { character: "[".length + "series".length, line: 2 },
                    start: { character: "[".length, line: 2 },
                },
                uri: document.uri,
            },
            DiagnosticSeverity.Error, "metric is required",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("A setting is specified in if statement", () => {
        const text =
            "list servers = vps, vds\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       metric = cpu_busy\n" +
            "       if server == 'vps'\n" +
            "           entity = vds\n" +
            "       else\n" +
            "           entity = vps\n" +
            "       endif\n" +
            "endfor\n";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("A setting is specified only in if-elseif statements", () => {
        const text =
            "list servers = vps, vds\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       metric = cpu_busy\n" +
            "       if server == 'vps'\n" +
            "           entity = vds\n" +
            "       elseif server = 'vds'\n" +
            "           entity = vps\n" +
            "       endif\n" +
            "endfor\n";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "   [".length + "series".length, line: 2 },
                    start: { character: "   [".length, line: 2 },
                },
                uri: document.uri,
            },
            DiagnosticSeverity.Error, "entity is required",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

});
