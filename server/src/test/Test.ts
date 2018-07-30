import * as assert from "assert";
import { Diagnostic, DocumentFormattingParams, TextDocument, TextEdit } from "vscode-languageserver/lib/main";
import Formatter from "../Formatter";
import Validator from "../Validator";

export default class Test {
    public static URI = "test";
    public static FORMAT_TEST = (data: Test) => {
        test((data.getName()), () => {
            assert.deepEqual(new Formatter(data.getDocument(), data.getParams()).lineByLine(), data.getExpected());
        });
    }
    public static VALIDATION_TEST = (data: Test) => {
        test((data.getName()), () => {
            assert.deepEqual(new Validator(data.getDocument()).lineByLine(), data.getExpected());
        });
    }
    private static LANGUAGE_ID = "test";
    private name: string;
    private document: TextDocument;
    private expected: Diagnostic[] | TextEdit[];
    private params: DocumentFormattingParams;

    constructor(name: string, text: string, expected: Diagnostic[] | TextEdit[], params?: DocumentFormattingParams) {
        this.name = name;
        this.document = TextDocument.create(Test.URI, Test.LANGUAGE_ID, 0, text);
        this.expected = expected;
        this.params = params;
    }

    public getDocument(): TextDocument {
        return this.document;
    }

    public getName(): string {
        return this.name;
    }

    public getExpected(): Diagnostic[] | TextEdit[] {
        return this.expected;
    }

    public getParams(): DocumentFormattingParams {
        return this.params;
    }
}
