import { TextDocument, Diagnostic, DiagnosticSeverity, Location } from "vscode-languageserver/lib/main";
import * as assert from 'assert';
import * as Functions from '../validateFunctions';

function createDoc(text: string): TextDocument {
    return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

function createDiagnostic(location: Location): Diagnostic {
    const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: location.range,
        message: "Non-existent alias",
        source: diagnosticSource,
        relatedInformation: []
    };
    diagnostic.relatedInformation.push({
        location: location,
        message: `The alias is referred, but never declared.`
    });
    return diagnostic;
}

const diagnosticSource = "Axibase Visual Plugin";

suite("Incorrect dealias tests", () => {

    test("One alias, one correct dealias", () => {
        const text =
            "alias = s1\n" +
            "value = value('s1') * 2";
        const document = createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.nonExistentAliases(document, true);
        assert.deepEqual(result, expected);
    });

    test("One alias, one incorrect dealias", () => {
        const text =
            "alias = s1\n" +
            "value = value('s2') * 2";
        const document = createDoc(text);
        const expected: Diagnostic[] = [createDiagnostic({
            uri: document.uri,
            range: { start: document.positionAt(26), end: document.positionAt(28) }
        })];
        const result = Functions.nonExistentAliases(document, true);
        assert.deepEqual(result, expected);
    });



    test("One alias, one correct dealias before the declaration", () => {
        const text =
        "value = value('s1') * 2\n" +
        "alias = s1";
        const document = createDoc(text);
        const expected: Diagnostic[] = [createDiagnostic({
            uri: document.uri,
            range: { start: { line: 0, character: 15}, end: { line: 0, character: 17} }
        })];
        const result = Functions.nonExistentAliases(document, true);
        assert.deepEqual(result, expected);
    });

    test("One alias, two incorrect dealiases", () => {
        const text =
            "alias = s1\n" +
            "value = value('s2') * 2\n" +
            "value = value('s3') * 2";
        const document = createDoc(text);
        const expected: Diagnostic[] = [createDiagnostic({
            uri: document.uri,
            range: { start: document.positionAt(26), end: document.positionAt(28) }
        }), createDiagnostic({
            uri: document.uri,
            range: { start: document.positionAt(50), end: document.positionAt(52) }
        })];
        const result = Functions.nonExistentAliases(document, true);
        assert.deepEqual(result, expected);
    });

    test("Two aliases, two correct dealiases", () => {
        const text =
            "alias = s1\n" +
            "alias = s2\n" +
            "value = value('s1') * 2\n" + 
            "value = value('s2') * 2";
        const document = createDoc(text);
        const expected: Diagnostic[] = [];
        const result = Functions.nonExistentAliases(document, true);
        assert.deepEqual(result, expected);
    });

    test("Two aliases, one incorrect dealias. one correct dealias", () => {
        const text =
            "alias = s1\n" +
            "alias = s2\n" +
            "value = value('s3') * 2\n" + 
            "value = value('s2') * 2";
        const document = createDoc(text);
        const expected: Diagnostic[] = [createDiagnostic({
            uri: document.uri,
            range: { start: document.positionAt(37), end: document.positionAt(39) }
        })];
        const result = Functions.nonExistentAliases(document, true);
        assert.deepEqual(result, expected);
    });
});