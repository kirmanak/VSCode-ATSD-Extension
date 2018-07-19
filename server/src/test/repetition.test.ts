import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import * as Functions from "../validateFunctions";

suite("Repetition of variables or settings tests", () => {

    test("Repetition of var name in 'var' and 'list'", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "var servers = 'srv1', 'srv2'\n";
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 1, character: "var ".length + "servers".length },
                    start: { line: 1, character: "var ".length },
                },
                uri: document.uri,
            },
            DiagnosticSeverity.Error, "servers is already defined",
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Repetition of var name in 'for' and 'list'", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for servers in servers\n" +
            "endfor";
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 1, character: "for ".length + "servers".length },
                    start: { line: 1, character: "for ".length },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "servers is already defined",
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Repetition of var name in 'csv' and 'list'", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "csv servers = vps, vds\n" +
            "   true, false\n" +
            "endcsv";
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 1, character: "csv ".length + "servers".length },
                    start: { line: 1, character: "csv ".length },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "servers is already defined",
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Repetition of var name in 'list' and 'csv'", () => {
        const text =
            "csv servers = vps, vds\n" +
            "   true, false\n" +
            "endcsv\n" +
            "list servers = 'srv1', 'srv2'";
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 3, character: "list ".length + "servers".length },
                    start: { line: 3, character: "list ".length },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "servers is already defined",
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Repetition of var name in 'for' and 'var'", () => {
        const text =
            "list servers = 'srv1', 'srv2'\n" +
            "for srv in servers\n" +
            "endfor\n" +
            "var srv = ['srv1', 'srv2']";
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Repetition of setting name", () => {
        const text =
            "[series]\n" +
            "   entity = srv\n" +
            "   entity = srv2\n" +
            "   metric = status";
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 2, character: "   ".length + "entity".length },
                    start: { line: 2, character: "   ".length },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Warning, "entity is already defined",
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Repetition of setting name", () => {
        const text =
            "[configuration]\n" +
            "   offset-right = 3\n" +
            "   offset-left = 4\n" +
            "   offset-right = 5";
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 3, character:  "   ".length + "offset-right".length },
                    start: { line: 3, character: "   ".length },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Warning, "offset-right is already defined",
        )];
        const result = Functions.lineByLine(document);
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
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 7, character: "   alias = ".length + "server".length },
                    start: { line: 7, character: "   alias = ".length },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "server is already defined",
        )];
        const result = Functions.lineByLine(document);
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
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
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
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
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
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 7, character: "           ".length +  "color".length },
                    start: { line: 7, character: "           ".length },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Warning, "color is already defined",
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { line: 9, character: "           ".length +  "color".length },
                    start: { line: 9, character: "           ".length },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Warning, "color is already defined",
        )];
        const result = Functions.lineByLine(document);
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
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 7, character: "           ".length +  "color".length },
                    start: { line: 7, character: "           ".length },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Warning, "color is already defined",
        )];
        const result = Functions.lineByLine(document);
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
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 9, character: "           ".length +  "color".length },
                    start: { line: 9, character: "           ".length },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Warning, "color is already defined",
        )];
        const result = Functions.lineByLine(document);
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
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 11, character: "           ".length +  "color".length },
                    start: { line: 11, character: "           ".length },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Warning, "color is already defined",
        )];
        const result = Functions.lineByLine(document);
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
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
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
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

});
