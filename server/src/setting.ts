import { Script } from "./script";

export class Setting {
    public readonly defaultValue: string | number | boolean;
    public readonly description: string;
    public readonly displayName: string;
    public readonly enum: string[];
    public readonly example: string | number | boolean;
    public readonly excludes: string[];
    public readonly maxValue: number;
    public readonly minValue: number;
    public readonly multiLine: boolean;
    public readonly name: string;
    public readonly script: Script;
    public readonly section: string;
    public readonly type: string;

    public constructor(displayName: string, type: string, example: string | number | boolean,
                       defaultValue?: string | number | boolean, array: string[] = [], multiLine: boolean = false,
                       maxValue: number = Number.MAX_VALUE, minValue: number = Number.MIN_VALUE, section?: string,
                       script?: Script, description: string = "", excludes: string[] = []) {
        this.displayName = displayName;
        this.name = displayName.toLowerCase()
            .replace(/[^a-z]/g, "");
        this.type = type;
        this.example = example;
        this.defaultValue = defaultValue;
        this.enum = [];
        array.forEach((item: string) => {
            this.enum.push(item.toLowerCase());
        });
        this.multiLine = multiLine;
        this.maxValue = maxValue;
        this.minValue = minValue;
        this.section = section;
        this.script = script;
        this.description = description;
        this.excludes = excludes;
    }
}
