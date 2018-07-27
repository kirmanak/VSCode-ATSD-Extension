import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity, TextDocument } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import Validator from "../Validator";

suite("Unmatched endfor tests", () => {

    test("One correct loop", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   do something\n" +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Two correct loops", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   do something\n" +
            "endfor\n" +
            "for server in servers\n" +
            "   do something\n" +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One incorrect loop", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   do something\n";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 3, line: 1 },
                    start: { character: 0, line: 1 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "for has no matching endfor",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Two incorrect loops", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   do something\n" +
            "for srv in servers\n" +
            "   do something\n";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                 range: {
                    end: { character: 3, line: 1 },
                    start: { character: 0, line: 1 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "for has no matching endfor",
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { character: 3, line: 3 },
                    start: { character: 0, line: 3 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "for has no matching endfor",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One incorrect loop, one correct loop", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   do something\n" +
            "for srv in servers\n" +
            "   do something\n" +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 3, line: 1 },
                    start: { character: 0, line: 1 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "for has no matching endfor",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

});
