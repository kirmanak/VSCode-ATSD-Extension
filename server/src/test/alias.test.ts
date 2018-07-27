import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import Validator from "../Validator";

suite("Incorrect dealias tests", () => {

    test("One alias, one correct dealias", () => {
        const text =
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   alias = s1\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s1') * 2";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One alias, one incorrect dealias", () => {
        const text =
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   alias = s1\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s2') * 2";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "   value = value('".length + "s2".length, line: 7 },
                    start: { character: "   value = value('".length, line: 7 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage("s2", "s1"),
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One alias, one correct dealias before the declaration", () => {
        const text =
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s1') * 2\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   alias = s1";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("One alias, two incorrect dealiases", () => {
        const text =
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   alias = s1\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s2') * 2\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s3') * 2";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "   value = value('".length + "s2".length, line: 7 },
                    start: { character: "   value = value('".length, line: 7 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage("s2", "s1"),
        ), Shared.createDiagnostic(
            {
                range: {
                    end: { character: "   value = value('".length + "s3".length, line: 11 },
                    start: { character:  "   value = value('".length, line: 11 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage("s3", "s1"),
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Two aliases, two correct dealiases", () => {
        const text =
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   alias = s1\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   alias = s2\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s1') * 2\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s2') * 2";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Two aliases, one incorrect dealias. one correct dealias", () => {
        const text =
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   alias = s1\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   alias = s2\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s3') * 2\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "   value = value('s2') * 2";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { character: "   value = value('".length + "s3".length, line: 11 },
                    start: { character:  "   value = value('".length, line: 11 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, Shared.errorMessage("s3", "s1"),
        )];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

    test("Declared series, indents are used, correct alias and dealias", () => {
        const text =
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "	alias = src\n" +
            "[series]\n" +
            "   metric = temp\n" +
            "   entity = srv\n" +
            "	value = value('src');\n";
        const document = Shared.createDoc(text);
        const validator = new Validator(document);
        const expected: Diagnostic[] = [];
        const result = validator.lineByLine();
        assert.deepEqual(result, expected);
    });

});
