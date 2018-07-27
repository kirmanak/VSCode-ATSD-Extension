import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity, TextDocument } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import Validator from "../Validator";

const firstVar = "serv";
const secondVar = "server";
const thirdVar = "srv";

suite("Undefined variable in for loop", () => {

    test("One correct loop", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            `for ${firstVar} in servers\n` +
            `   [series]\n` +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar}}\n` +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One correct loop with comment", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            `for ${firstVar} /* this is a comment */ in servers\n` +
            `   [series]\n` +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar}}\n` +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Two correct  loops", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            `for ${firstVar} in servers\n` +
            `   [series]\n` +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar}}\n` +
            "endfor\n" +
            `for ${firstVar} in servers\n` +
            `   [series]\n` +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar}}\n` +
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
            `for ${secondVar} in servers\n` +
            `   [series]\n` +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar}}\n` +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: `       entity = @{`.length + firstVar.length, line: 4 }
                    start: { character: `       entity = @{`.length, line: 4 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage(firstVar, secondVar),
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Two incorrect loops", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            `for ${secondVar} in servers\n` +
            `   [series]\n` +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar}}\n` +
            "endfor\n" +
            `for ${firstVar} in servers\n` +
            `   [series]\n` +
            "       metric = placeholder\n" +
            `       entity = @{${secondVar}}\n` +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: `       entity = @{`.length + firstVar.length, line: 4 }
                    start: { character: `       entity = @{`.length, line: 4 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage(firstVar, secondVar),
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { character: `       entity = @{`.length + secondVar.length, line: 9 }
                    start: { character: `       entity = @{`.length, line: 9 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage(secondVar, "servers"),
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One incorrect loop, one correct loop", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            `for ${secondVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar}}\n` +
            "endfor\n" +
            `for ${firstVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar}}\n` +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: `       entity = @{`.length + firstVar.length, line: 4 }
                    start: { character: `       entity = @{`.length, line: 4 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage(firstVar, secondVar),
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One correct nested loop", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            `for ${secondVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{${secondVar}}\n` +
            `   for ${firstVar} in servers\n` +
            "       [series]\n" +
            "           metric = placeholder\n" +
            `           entity = @{${secondVar}}\n` +
            "       [series]\n" +
            "           metric = placeholder\n" +
            `           entity = @{${firstVar}}\n` +
            "   endfor\n" +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One incorrect nested loop", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            `for ${secondVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{${secondVar}}\n` +
            `   for ${firstVar} in servers\n` +
            "       [series]\n" +
            "           metric = placeholder\n" +
            `           entity = @{${thirdVar}}\n` +
            "       [series]\n" +
            "           metric = placeholder\n" +
            `           entity = @{${firstVar}}\n` +
            "   endfor\n" +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: `           entity = @{`.length + thirdVar.length, line: 8 }
                    start: { character: `           entity = @{`.length, line: 8 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage(thirdVar, firstVar),
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Arithmetic expression with correct var", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            `for ${firstVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar} + ${firstVar}}\n` +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Arithmetic expression with incorrect var", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            `for ${firstVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{${secondVar} + ${firstVar}}\n` +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: `       entity = @{`.length + secondVar.length, line: 4 }
                    start: { character: `       entity = @{`.length, line: 4 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage(secondVar, "servers"),
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Function + correct var", () => {
        const text =
            "list servers = 's1v1', 's1v2'\n" +
            `for ${secondVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{keepAfterLast(${secondVar}, '1')}\n` +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Property of a correct var", () => {
        const text =
            "var servers = [ { name: 'srv1' }, { name: 'srv2' } ]\n" +
            `for ${secondVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{${secondVar}.name}\n` +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("String", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            `for ${secondVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{keepAfterLast(${secondVar}, 'v')}\n` +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Several statements, second incorrect", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            `for ${secondVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{keepAfterLast(${secondVar}, 'v')}, @{${firstVar}}\n` +
            "endfor";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: {
                        character: `       entity = @{keepAfterLast(${secondVar}, 'v')}, @{`.length + firstVar.length,
                        line: 4,
                    },
                    start: { character: `       entity = @{keepAfterLast(${secondVar}, 'v')}, @{`.length, line: 4 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage(firstVar, secondVar),
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

});
