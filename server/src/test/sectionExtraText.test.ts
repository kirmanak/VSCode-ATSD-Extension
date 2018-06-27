import { TextDocument, TextEdit } from 'vscode-languageserver';
import * as assert from 'assert';
import * as Functions from '../formatFunctions';

function createDoc(text: string): TextDocument {
    return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

suite("Extra text in section declaration line", () => {

    test("Correct declaration with previous text", () => {
        const text = 
            "some text\n" + 
            "\n" +
            "[series]\n" + 
            "   alias = s1";
        const document = createDoc(text);
        const expected: TextEdit[] = [];
        const result = Functions.extraTextSectionLine(document);
        assert.deepEqual(result, expected);
    });

    test("Correct declaration without previous text", () => {
        const text =  
            "[series]\n" + 
            "   alias = s1";
        const document = createDoc(text);
        const expected: TextEdit[] = [];
        const result = Functions.extraTextSectionLine(document);
        assert.deepEqual(result, expected);
    });

    test("Incorrect declaration (text after)", () => {
        const text =  
            "[series]incorrect formatting\n" + 
            "   alias = s1";
        const document = createDoc(text);
        const expected: TextEdit[] = [{
            newText: "[series]\n\tincorrect formatting",
            range: { start: {line: 0, character: 0 }, end: { line: 0, character: 28 } }
        }];
        const result = Functions.extraTextSectionLine(document);
        assert.deepEqual(result, expected);
    });

    test("Incorrect declaration (text before)", () => {
        const text =  
            "incorrect formatting[series]\n" + 
            "   alias = s1";
        const document = createDoc(text);
        const expected: TextEdit[] = [{
            newText: "incorrect formatting\n\n[series]",
            range: { start: {line: 0, character: 0 }, end: { line: 0, character: 28 } }
        }];
        const result = Functions.extraTextSectionLine(document);
        assert.deepEqual(result, expected);
    });

    test("Incorrect declaration (text before and after)", () => {
        const text =  
            "incorrect formatting[series]incorrect formatting\n" + 
            "   alias = s1";
        const document = createDoc(text);
        const expected: TextEdit[] = [{
            newText: "incorrect formatting\n\n[series]\n\tincorrect formatting",
            range: { start: {line: 0, character: 0 }, end: { line: 0, character: 48 } }
        }];
        const result = Functions.extraTextSectionLine(document);
        assert.deepEqual(result, expected);
    });
});