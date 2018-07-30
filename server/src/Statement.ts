import { Range } from "vscode-languageserver";

export default class Statement {
    public range: Range;
    public declaration: string;
    public imports: string[];
}
