import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity, TextDocument } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import * as Functions from "../validateFunctions";

suite("Unmatched endfor tests", () => {

    test("One correct loop", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   do something\n" +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
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
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("One incorrect loop", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   do something\n";
        const document: TextDocument = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 1, character: 3 },
                    start: { line: 1, character: 0 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "for has no matching endfor",
        )];
        const result = Functions.lineByLine(document);
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
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                 range: {
                    end: { line: 1, character: 3 },
                    start: { line: 1, character: 0 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "for has no matching endfor",
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { line: 3, character: 3 },
                    start: { line: 3, character: 0 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "for has no matching endfor",
        )];
        const result = Functions.lineByLine(document);
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
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 1, character: 3 },
                    start: { line: 1, character: 0 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "for has no matching endfor",
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

});
