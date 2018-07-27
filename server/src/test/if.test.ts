import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity, TextDocument } from "vscode-languageserver";
import * as Shared from "../sharedFunctions";
import Validator from "../Validator";

const elseIfError = "elseif has no matching if";
const elseError = "else has no matching if";
const endIfError = "endif has no matching if";
const ifError = "if has no matching endif";

suite("If elseif else endif validation tests", () => {

    test("One correct if-elseif-endif", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "  [series]\n" +
            "    metric = temp\n" +
            "    entity = @{server}\n" +
            "    if server == 'srv1'\n" +
            "      color = red\n" +
            "    elseif server == 'srv2'\n" +
            "      color = yellow\n" +
            "    endif\n" +
            "endfor\n";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One correct if-else-endif", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "  [series]\n" +
            "    metric = temp\n" +
            "    entity = @{server}\n" +
            "    if server == 'srv1'\n" +
            "      color = red\n" +
            "    else\n" +
            "      color = yellow\n" +
            "    endif\n" +
            "endfor\n";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One incorrect elseif-endif", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "  [series]\n" +
            "    metric = temp\n" +
            "    entity = @{server}\n" +
            "    elseif server == 'srv1'\n" +
            "      color = yellow\n" +
            "    endif\n" +
            "endfor\n";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 10, line: 5 },
                    start: { character: 4, line: 5 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, elseIfError,
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { character: 9, line: 7 },
                    start: { character: 4, line: 7 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, endIfError,
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One incorrect else-endif", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "  [series]\n" +
            "    metric = temp\n" +
            "    entity = @{server}\n" +
            "    else\n" +
            "      color = yellow\n" +
            "    endif\n" +
            "endfor\n";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 8, line: 5 },
                    start: { character: 4, line: 5 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, elseError,
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { character: 9, line: 7 },
                    start: { character: 4, line: 7 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, endIfError,
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One incorrect else-endif with comment", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "  [series]\n" +
            "    metric = temp\n" +
            "    entity = @{server}\n" +
            "    /* this is a comment */ else\n" +
            "      color = yellow\n" +
            "    endif /* a comment */ # too\n" +
            "endfor\n";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 32, line: 5 },
                    start: { character: 28, line: 5 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, elseError,
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { character: 9, line: 7 },
                    start: { character: 4, line: 7 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, endIfError,
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One incorrect if-else", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "  [series]\n" +
            "    metric = temp\n" +
            "    entity = @{server}\n" +
            "    if server == 'srv1'\n" +
            "      color = red\n" +
            "    else\n" +
            "      color = yellow\n" +
            "endfor\n";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 6, line: 9 },
                    start: { character: 0, line: 9 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "for has finished before if",
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { character: 6, line: 5 },
                    start: { character: 4, line: 5 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, ifError,
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

});
