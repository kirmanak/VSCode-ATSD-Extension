import * as assert from "assert";
import { Diagnostic, DocumentFormattingParams, TextDocument, TextEdit } from "vscode-languageserver";
import { Formatter } from "../formatter";
import { Validator } from "../validator";

export class Test {
    // tslint:disable-next-line:typedef
    public static URI = "test";
    public static FORMAT_TEST: (data: Test) => void = (data: Test) => {
        test((data.getName()), () => {
            assert.deepEqual(new Formatter(data.getDocument(), data.getParams()).lineByLine(), data.getExpected());
        });
    }
    public static VALIDATION_TEST: (data: Test) => void = (data: Test) => {
        test((data.getName()), () => {
            assert.deepEqual(new Validator(data.getDocument()).lineByLine(), data.getExpected());
        });
    }
    // tslint:disable-next-line:typedef
    private static LANGUAGE_ID = "test";
    private document: TextDocument;
    private expected: Diagnostic[] | TextEdit[];
    private name: string;
    private params: DocumentFormattingParams;

    public constructor(name: string, text: string, expected: Diagnostic[] | TextEdit[],
                       params?: DocumentFormattingParams) {
        this.name = name;
        this.document = TextDocument.create(Test.URI, Test.LANGUAGE_ID, 0, text);
        this.expected = expected;
        this.params = params;
    }

    public getDocument(): TextDocument {
        return this.document;
    }

    public getExpected(): Diagnostic[] | TextEdit[] {
        return this.expected;
    }

    public getName(): string {
        return this.name;
    }

    public getParams(): DocumentFormattingParams {
        return this.params;
    }
}
