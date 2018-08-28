export class Field {
  public readonly args: Field[];
  public readonly description: string;
  public readonly name: string;
  public readonly required: boolean;
  public readonly type: string;

  public constructor(type: string, name: string, description: string = "",
                     args: Field[] = [], required: boolean = true) {
    this.type = type;
    this.name = name;
    this.args = args;
    this.description = description;
    this.required = required;
  }

}
