import * as assert from "assert";
import { Diagnostic, FormattingOptions, TextEdit } from "vscode-languageserver";
import { Formatter } from "../formatter";
import { Validator } from "../validator";

export class Test {
    private readonly expected: Diagnostic[] | TextEdit[];
    private readonly name: string;
    private readonly options: FormattingOptions;
    private readonly text: string;

    public constructor(name: string, text: string, expected: Diagnostic[] | TextEdit[], options?: FormattingOptions) {
        this.name = name;
        this.text = text;
        this.expected = expected;
        this.options = options;
    }

    public formatTest(): void {
        test((this.name), () => {
            assert.deepEqual(new Formatter(this.text, this.options).lineByLine(), this.expected);
        });
    }

    public validationTest(): void {
        test((this.name), () => {
            assert.deepEqual(new Validator(this.text).lineByLine(), this.expected);
        });
    }
}
