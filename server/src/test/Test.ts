import * as assert from "assert";
import { Diagnostic, TextDocument } from "vscode-languageserver/lib/main";
import Validator from "../Validator";

export default class Test {
    public static URI = "test";
    public static RUN_TEST = (data: Test) => {
        test((data.getName()), () => {
            assert.deepEqual(new Validator(data.getDocument()).lineByLine(), data.getExpected());
        });
    }
    private static LANGUAGE_ID = "test";
    private name: string;
    private document: TextDocument;
    private expected: Diagnostic[];

    constructor(name: string, text: string, expected: Diagnostic[]) {
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

    public getExpected(): Diagnostic[] {
        return this.expected;
    }
}
