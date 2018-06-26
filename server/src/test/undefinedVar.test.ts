import { TextDocument, Diagnostic, DiagnosticSeverity, Location } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';

function createDoc(text: string): TextDocument {
    return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

function createDiagnostic(varName: string, location: Location): Diagnostic {
    const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: location.range,
        message: `${varName} is undefined`,
        source: diagnosticSource,
        relatedInformation: []
    };
    diagnostic.relatedInformation.push({
        location: location,
        message: `${varName} is used in loop, but wasn't declared`
    });
    return diagnostic;
}

const diagnosticSource = "Axibase Visual Plugin";
const firstVar = 'serv';
const secondVar = 'server';
const thirdVar = 'srv';

suite("Undefined variable in for loop", () => {

    test("One correct loop", () => {
        const text =
            `for ${firstVar} in servers\n` +
            `   entity = @{${firstVar}}\n` +
            "endfor";
        const document: TextDocument = createDoc(text);
        const result = Functions.undefinedForVariables(document, true);
        assert.deepEqual(result, []);
    });

    test("Two correct  loops", () => {
        const text =
            `for ${firstVar} in servers\n` +
            `   entity = @{${firstVar}}\n` +
            "endfor\n" +
            `for ${firstVar} in servers\n` +
            `   entity = @{${firstVar}}\n` +
            "endfor";
        const document: TextDocument = createDoc(text);
        const result = Functions.undefinedForVariables(document, true);
        assert.deepEqual(result, []);
    });

    test("One incorrect loop", () => {
        const text =
            `for ${secondVar} in servers\n` +
            `   entity = @{${firstVar}}\n` +
            "endfor";
        const document: TextDocument = createDoc(text);
        const expected: Diagnostic[] = [createDiagnostic(firstVar, {
            uri: document.uri,
            range: { start: document.positionAt(37), end: document.positionAt(41) }
        })];
        const result = Functions.undefinedForVariables(document, true);
        assert.deepEqual(result, expected);
    });

    test("Two incorrect loops", () => {
        const text =
            `for ${secondVar} in servers\n` +
            `   entity = @{${firstVar}}\n` +
            "endfor\n" +
            `for ${firstVar} in servers\n` +
            `   entity = @{${secondVar}}\n` +
            "endfor";
        const document: TextDocument = createDoc(text);
        const expected: Diagnostic[] = [createDiagnostic(firstVar, {
            uri: document.uri,
            range: { start: document.positionAt(37), end: document.positionAt(41) }
        }), createDiagnostic(secondVar, {
            uri: document.uri,
            range: { start: document.positionAt(84), end: document.positionAt(90) }
        })];
        const result = Functions.undefinedForVariables(document, true);
        assert.deepEqual(result, expected);
    });

    test("One incorrect loop, one correct loop", () => {
        const text =
            `for ${secondVar} in servers\n` +
            `   entity = @{${firstVar}}\n` +
            "endfor\n" +
            `for ${firstVar} in servers\n` +
            `   entity = @{${firstVar}}\n` +
            "endfor";
        const document: TextDocument = createDoc(text);
        const expected: Diagnostic[] = [createDiagnostic(firstVar, {
            uri: document.uri,
            range: { start: document.positionAt(37), end: document.positionAt(41) }
        })];
        const result = Functions.undefinedForVariables(document, true);
        assert.deepEqual(result, expected);
    });

    test("One correct nested loop", () => {
        const text =
            `for ${secondVar} in servers\n` +
            `   entity = @{${secondVar}}\n` +
            `   for ${firstVar} in servers\n` +
            `       entity = @{${secondVar}}\n` +
            `       entity = @{${firstVar}}\n` +
            "   endfor\n" +
            "endfor";
        const document: TextDocument = createDoc(text);
        const result = Functions.undefinedForVariables(document, true);
        assert.deepEqual(result, []);
    });

    test("One incorrect nested loop", () => {
        const text =
            `for ${secondVar} in servers\n` +
            `   entity = @{${secondVar}}\n` +
            `   for ${firstVar} in servers\n` +
            `       entity = @{${thirdVar}}\n` +
            `       entity = @{${firstVar}}\n` +
            "   endfor\n" +
            "endfor";
        const document: TextDocument = createDoc(text);
        const expected: Diagnostic[] = [createDiagnostic(thirdVar, {
            uri: document.uri,
            range: { start: document.positionAt(86), end: document.positionAt(89) }
        })];
        const result = Functions.undefinedForVariables(document, true);
        assert.deepEqual(result, expected);
    });
});