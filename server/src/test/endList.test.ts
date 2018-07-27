import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity, TextDocument } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import Validator from "../Validator";

const errorMessage = "list has no matching endlist";

suite("Unfinished list", () => {

    test("One correct oneline list", () => {
        const text =
            "list servers = vps, vds\n";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One correct multiline list", () => {
        const text =
            "list servers = vps, \n" +
            "	vds\n" +
            "endlist";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One incorrect multiline list", () => {
        const text =
            "list servers = vps, \n" +
            "	vds\n" +
            "edlist";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 4, line: 0 },
                    start: { character: 0, line: 0 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, errorMessage,
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One incorrect multiline list with comment before", () => {
        const text =
            "/* this is\n" +
            "a comment\n" +
            "to check correct range */\n" +
            "\n" +
            "list servers = vps, \n" +
            "	vds\n" +
            "edlist";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 4, line: 4 },
                    start: { character: 0, line: 4 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, errorMessage,
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One incorrect multiline list with comment on the line", () => {
        const text =
            "/* test */ list servers = vps, \n" +
            "	vds\n" +
            "edlist";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 15, line: 0 },
                    start: { character: 11, line: 0 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, errorMessage,
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One incorrect multiline list with comments", () => {
        const text =
            "/* this is\n" +
            "a comment\n" +
            "to check correct range */\n" +
            "\n" +
            "/* test */ list servers = vps, \n" +
            "	vds\n" +
            "edlist";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 15, line: 4 },
                    start: { character: 11, line: 4 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, errorMessage,
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Three lists, one incorrect", () => {
        const text =
            "list servers1 = vps, \n" +
            "	vds\n" +
            "endlist\n" +
            "list servers2 = vps, \n" +
            "	vds\n" +
            "edlist\n" +
            "list servers3 = vps, \n" +
            "	vds\n" +
            "endlist\n";
        const document: TextDocument = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 4, line: 3 },
                    start: { character: 0, line: 3 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, errorMessage,
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);

    });

    test("Correct multiline list, comma on next line", () => {
        const text =
            "list servers = vps\n" +
            "	,vds\n" +
            "endlist";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Incorrect multiline list, comma on next line", () => {
        const text =
            "list servers = vps\n" +
            "	,vds\n" +
            "edlist";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 4, line: 0 },
                    start: { character: 0, line: 0 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, errorMessage,
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

});
