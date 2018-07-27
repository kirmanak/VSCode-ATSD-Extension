import { Diagnostic } from "vscode-languageserver/lib/main";

export default class Test {
    private name: string;
    private text: string;
    private expected: Diagnostic[];

    constructor(name: string, text: string, expected: Diagnostic[]) {
        this.name = name;
        this.text = text;
        this.expected = expected;
    }

    public getText(): string {
        return this.text;
    }

    public getName(): string {
        return this.name;
    }

    public getExpected(): Diagnostic[] {
        return this.expected;
    }
}
