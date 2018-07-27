import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import Validator from "../Validator";

suite("Var endvar tests", () => {

    test("Correct oneline var array", () => {
        const text =
            "var v = [[9,3], [9,4]]";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Correct oneline var props", () => {
        const text =
            `var v = { "hello": "value", "array": ["val", "value"]}`;
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Correct multiline var props", () => {
        const text =
            `var v = {\n` +
            `   "hello": "value", \n` +
            `   "array": ["val", "value"]\n` +
            `}\n` +
            `endvar`;
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Correct multiline var array", () => {
        const text =
            "var v = [\n" +
            "    [9,3], [9,4]\n" +
            "]\n" +
            "endvar";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Incorrect multiline var array", () => {
        const text =
            "var v = [\n" +
            "    [9,3], [9,4]\n" +
            "]\n" +
            "edvar";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 3, line: 0 },
                    start: { character: 0, line: 0 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "var has no matching endvar",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Incorrect multiline var props", () => {
        const text =
            `var v = {\n` +
            `   "hello": "value", \n` +
            `   "array": ["val", "value"]\n` +
            `}\n` +
            `edvar`;
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 3, line: 0 },
                    start: { character: 0, line: 0 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "var has no matching endvar",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Incorrect multiline var mixed array of props", () => {
        const text =
            `var v = [\n` +
            `   { "hello": "value" }, \n` +
            `   { "array": ["val", "value"] }\n` +
            `]\n` +
            `edvar`;
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: 3, line: 0 },
                    start: { character: 0, line: 0 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, "var has no matching endvar",
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Correct var function call", () => {
        const text =
            `var v = getEntities("hello")`;
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

});
