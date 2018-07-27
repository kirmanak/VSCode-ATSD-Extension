import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import Validator from "../Validator";

suite("Repetition of variables or settings tests", () => {

    test("Repetition of var name in 'var' and 'list'", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "var servers = 'srv1', 'srv2'\n";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "var ".length + "servers".length, line: 1 },
                    start: { character: "var ".length, line: 1 },
                },
                uri: document.uri,
            },
            DiagnosticSeverity.Error, "servers is already defined",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Repetition of var name in 'for' and 'list'", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for servers in servers\n" +
            "endfor";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "for ".length + "servers".length, line: 1 },
                    start: { character: "for ".length, line: 1 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "servers is already defined",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Repetition of var name in 'csv' and 'list'", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "csv servers = vps, vds\n" +
            "   true, false\n" +
            "endcsv";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "csv ".length + "servers".length, line: 1 },
                    start: { character: "csv ".length, line: 1 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "servers is already defined",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Repetition of var name in 'list' and 'csv'", () => {
        const text =
            "csv servers = vps, vds\n" +
            "   true, false\n" +
            "endcsv\n" +
            "list servers = 'srv1', 'srv2'";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "list ".length + "servers".length, line: 3 },
                    start: { character: "list ".length, line: 3 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "servers is already defined",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Repetition of var name in 'for' and 'var'", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for srv in servers\n" +
            "endfor\n" +
            "var srv = ['srv1', 'srv2']";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Repetition of setting name", () => {
        const text =
            "[series]\n" +
            "   entity = srv\n" +
            "   entity = srv2\n" +
            "   metric = status";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "   ".length + "entity".length, line: 2 },
                    start: { character: "   ".length, line: 2 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Warning, "entity is already defined",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Shadowing of a setting from parent section", () => {
        const text =
            "[configuration]\n" +
            "   entity = srv\n" +
            "[series]\n" +
            "   entity = srv2\n" +
            "   metric = status";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character:  "   ".length + "entity".length, line: 3 },
                    start: { character: "   ".length, line: 3 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Hint, "entity is already defined",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Repetition of aliases", () => {
        const text =
            "[series]\n" +
            "   entity = srv\n" +
            "   metric = temp\n" +
            "   alias = server\n" +
            "[series]\n" +
            "   entity = srv\n" +
            "   metric = temp\n" +
            "   alias = server";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "   alias = ".length + "server".length, line: 7 },
                    start: { character: "   alias = ".length, line: 7 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "server is already defined",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Repetition of aliases in different widgets", () => {
        const text =
            "[widget]\n" +
            "   type = chart\n" +
            "[series]\n" +
            "   entity = srv\n" +
            "   metric = temp\n" +
            "   alias = server\n" +
            "[widget]\n" +
            "   type = chart\n" +
            "[series]\n" +
            "   entity = srv\n" +
            "   metric = temp\n" +
            "   alias = server";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Same name for alias and list", () => {
        const text =
            "list server = 'srv1', 'srv2'\n" +
            "[series]\n" +
            "   entity = srv\n" +
            "   metric = temp\n" +
            "   alias = server";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Repetition of declared settings in if", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       entity = srv\n" +
            "       metric = temp\n" +
            "       color = 'yellow'\n" +
            "       if server = 'srv1'\n" +
            "           color = 'red'\n" +
            "       else\n" +
            "           color = 'green'\n" +
            "       endif\n" +
            "endfor\n";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "           ".length +  "color".length, line: 7 },
                    start: { character: "           ".length, line: 7 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Warning, "color is already defined",
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { character: "           ".length +  "color".length, line: 9 },
                    start: { character: "           ".length, line: 9 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Warning, "color is already defined",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Repetition of declared in parent settings in if", () => {
        const text =
            "[widget]\n" +
            "   type = chart\n" +
            "   entity = srv\n" +
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       metric = temp\n" +
            "       if server = 'srv1'\n" +
            "           entity = srv2\n" +
            "       else\n" +
            "           entity = srv1\n" +
            "       endif\n" +
            "endfor\n";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "           ".length +  "entity".length, line: 8 },
                    start: { character: "           ".length, line: 8 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Hint, "entity is already defined",
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { character: "           ".length +  "entity".length, line: 10 },
                    start: { character: "           ".length, line: 10 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Hint, "entity is already defined",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Repetition of settings in if then", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       entity = srv\n" +
            "       metric = temp\n" +
            "       if server = 'srv1'\n" +
            "           color = 'yellow'\n" +
            "           color = 'red'\n" +
            "       else\n" +
            "           color = 'green'\n" +
            "       endif\n" +
            "endfor\n";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "           ".length +  "color".length, line: 7 },
                    start: { character: "           ".length, line: 7 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Warning, "color is already defined",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Repetition of settings in if else", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       entity = srv\n" +
            "       metric = temp\n" +
            "       if server = 'srv1'\n" +
            "           color = 'yellow'\n" +
            "       else\n" +
            "           color = 'red'\n" +
            "           color = 'green'\n" +
            "       endif\n" +
            "endfor\n";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "           ".length +  "color".length, line: 9 },
                    start: { character: "           ".length, line: 9 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Warning, "color is already defined",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Repetition of settings in if elseif", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       entity = srv\n" +
            "       metric = temp\n" +
            "       if server = 'srv1'\n" +
            "           color = 'yellow'\n" +
            "       elseif server = 'srv2'\n" +
            "           color = 'black'\n" +
            "       else\n" +
            "           color = 'red'\n" +
            "           color = 'green'\n" +
            "       endif\n" +
            "endfor\n";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "           ".length +  "color".length, line: 11 },
                    start: { character: "           ".length, line: 11 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Warning, "color is already defined",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Repetition of settings in if else next section", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       entity = srv\n" +
            "       metric = temp\n" +
            "       if server = 'srv1'\n" +
            "           color = 'yellow'\n" +
            "       elseif server = 'srv2'\n" +
            "           color = 'black'\n" +
            "       else\n" +
            "           color = 'green'\n" +
            "       endif\n" +
            "   [series]\n" +
            "       entity = srv\n" +
            "       metric = temp\n" +
            "       if server = 'srv1'\n" +
            "           color = 'yellow'\n" +
            "       else\n" +
            "           color = 'green'\n" +
            "       endif\n" +
            "endfor\n";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Repetition of settings in if else next section without if", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for server in servers\n" +
            "   [series]\n" +
            "       entity = srv\n" +
            "       metric = temp\n" +
            "       if server = 'srv1'\n" +
            "           color = 'yellow'\n" +
            "       elseif server = 'srv2'\n" +
            "           color = 'black'\n" +
            "       else\n" +
            "           color = 'green'\n" +
            "       endif\n" +
            "   [series]\n" +
            "       entity = srv\n" +
            "       metric = temp\n" +
            "       color = 'yellow'\n" +
            "endfor\n";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

});
