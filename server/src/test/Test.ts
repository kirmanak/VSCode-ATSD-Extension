import * as assert from "assert";
import { Diagnostic, TextDocument, TextEdit } from "vscode-languageserver/lib/main";
import Formatter from "../Formatter";
import Validator from "../Validator";

export default class Test {
    public static URI = "test";
    public static FORMAT_TEST = (data: Test) => {
        test((data.getName()), () => {
            assert.deepEqual(new Formatter(data.getDocument()).lineByLine(), data.getExpected());
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

    constructor(name: string, text: string, expected: Diagnostic[] | TextEdit[]) {
        this.name = name;
        this.document = TextDocument.create(Test.URI, Test.LANGUAGE_ID, 0, text);
        this.expected = expected;
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
}
