import * as assert from "assert";
import { Diagnostic, DocumentFormattingParams, TextDocument, TextEdit } from "vscode-languageserver";
import { Formatter } from "../formatter";
import { Validator } from "../validator";

export class Test {
    public static readonly URI: string = "test";

    private static readonly LANGUAGE_ID: string = "test";
    private readonly document: TextDocument;
    private readonly expected: Diagnostic[] | TextEdit[];
    private readonly name: string;
    private readonly params: DocumentFormattingParams;

    public constructor(name: string, text: string, expected: Diagnostic[] | TextEdit[],
                       params?: DocumentFormattingParams) {
        this.name = name;
        this.document = TextDocument.create(Test.URI, Test.LANGUAGE_ID, 0, text);
        this.expected = expected;
        this.params = params;
    }

    public formatTest(): void {
        test((this.name), () => {
            assert.deepEqual(new Formatter(this.document, this.params).lineByLine(), this.expected);
        });
    }

    public validationTest(): void {
        test((this.name), () => {
            assert.deepEqual(new Validator(this.document).lineByLine(), this.expected);
        });
    }
}
