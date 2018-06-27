import { TextDocument, TextEdit } from 'vscode-languageserver';
import * as assert from 'assert';
import * as Functions from '../formatFunctions';

function createDoc(text: string): TextDocument {
    return TextDocument.create("testDoc", "atsd-visual", 0, text);
}

suite("Extra text in section declaration line", () => {

    test("Correct declaration", () => {
        const text = 
            "some text\n"
            "\n"
            "[series]\n" + 
            "   alias = s1";
        const document = createDoc(text);
        const expected: TextEdit[] = [];
        const result = Functions.extraTextSectionLine(document);
        assert.deepEqual(result, expected);
    });

});