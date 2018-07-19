import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/lib/main";
import * as Shared from "../sharedFunctions";
import * as Functions from "../validateFunctions";

const errorMessage = "script has no matching endscript";

suite("Script endscript tests", () => {

    test("Correct empty script", () => {
        const text =
            `script\n` +
            `endscript`;
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Unclosed empty script", () => {
        const text =
            `script\n` +
            `endscrpt`;
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 0, character: 6 },
                    start: { line: 0, character: 0 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, errorMessage,
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Script with unclosed for", () => {
        const text =
            `script\n` +
            `	for (let i = 0; i < 5; i++) {}\n` +
            `endscript`;
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Two correct scripts", () => {
        const text =
            `script\n` +
            `	for (let i = 0; i < 5; i++) {}\n` +
            `endscript\n` +
            `script\n` +
            `	for (let i = 0; i < 5; i++) {}\n` +
            `endscript`;
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Two unclosed scripts", () => {
        const text =
            `script\n` +
            `endscrpt\n` +
            `script\n` +
            `endscrpt`;
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 0, character: 6 },
                    start: { line: 0, character: 0 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, errorMessage,
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Correct one-line script = ", () => {
        const text =
            `script = if (!config.isDialog) c = widget`;
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Correct multi-line script = ", () => {
        const text =
            `script = if \n` +
            `\n` +
            `		(!config.isDialog)\n` +
            `			c = widget\n` +
            `endscript`;
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Unfinished one-line script = ", () => {
        const text =
            `script = `;
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [Shared.createDiagnostic(
            {
                range: {
                    end: { line: 0, character: 6 },
                    start: { line: 0, character: 0 },
                }, uri: document.uri,
            },
            DiagnosticSeverity.Error, errorMessage,
        )];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Correct empty one-line script = ", () => {
        const text =
            `script = \n` +
            `endscript`;
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

    test("Incorrect multi-line script = ", () => {
        const text =
            `script = if \n` +
            `\n` +
            `		(!config.isDialog)\n` +
            `			c = widget\n` +
            `endscript`;
        const document = Shared.createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.lineByLine(document);
        assert.deepEqual(result, expected);
    });

});
