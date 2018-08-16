import {
  Event, EventEmitter, TextDocument, TextDocumentContentProvider, TextEditor,
  Uri, window, workspace, WorkspaceConfiguration,
} from "vscode";

export class AxibaseChartsProvider implements TextDocumentContentProvider {
  private auth: boolean = true;
  private readonly onDidChangeEmitter: EventEmitter<Uri>;
  private password: string;
  private text: string;
  private url: string;
  private username: string;
  private withCredentials: string;

  public constructor() {
    this.onDidChangeEmitter = new EventEmitter<Uri>();
  }

  public get onDidChange(): Event<Uri> {
    return this.onDidChangeEmitter.event;
  }

  public async provideTextDocumentContent(): Promise<string> {
    const editor: TextEditor = window.activeTextEditor;
    if (!editor) {
      window.showErrorMessage("Please, click on portal configuration editor and try again");

      return Promise.reject();
    }
    const document: TextDocument = editor.document;
    if (document.languageId !== "axibasecharts") {
      window.showErrorMessage("Please, choose a right portal configuration");

      return Promise.reject();
    }
    this.text = deleteComments(document.getText());
    const configuration: WorkspaceConfiguration = workspace.getConfiguration("axibaseCharts", document.uri);
    if (!this.url) {
      this.url = configuration.get("url");
      if (!this.url) {
        this.url = await window.showInputBox({
          ignoreFocusOut: true, placeHolder: "http(s)://atsd_host:port",
          prompt: "Can be stored permanently in 'axibaseCharts.url' setting",
        });
        if (!this.url) {
          window.showInformationMessage("You did not specify an URL address");

          return Promise.reject();
        }
      }
    }
    this.clearUrl();
    this.replaceImports();

    if (this.auth && !this.username) {
      this.username = configuration.get("username");
      if (!this.username) {
        this.username = await window.showInputBox({
          ignoreFocusOut: true, placeHolder: "username",
          prompt: "Specify only if API is closed for guests. Value can be stored in 'axibaseCharts.username'",
        });
      }
    }
    if (this.username && this.auth) {
      if (!this.password) {
        this.password = await window.showInputBox({
          ignoreFocusOut: true, password: true,
          prompt: "Please, enter the password. Can not be stored",
        });
      }
      if (this.password) {
        this.addCredentials();
      }
    } else {
      this.auth = false;
    }
    if (!this.auth) {
      this.withCredentials = this.url;
    }
    this.addUrl();

    return this.getHtml();
  }

  public update(uri: Uri): void {
    this.onDidChangeEmitter.fire(uri);
  }

  private addCredentials(): void {
    const match: RegExpExecArray = /https?:\/\//i.exec(this.url);
    this.withCredentials = (match) ?
      `${match[0]}${this.username}:${this.password}@${this.url.substr(match.index + match[0].length)}` : this.url;
  }

  private addUrl(): void {
    let match: RegExpExecArray = /^[ \t]*\[configuration\]/mi.exec(this.text);
    if (match === null) {
      match = /\S/.exec(this.text);
      if (match === null) {
        return;
      }
      this.text =
        `${this.text.substr(0, match.index - 1)}[configuration]\n  ${this.text.substr(match.index)}`;
      match = /^[ \t]*\[configuration\]/i.exec(this.text);
    }
    this.text = `${this.text.substr(0, match.index + match[0].length + 1)}  url = ${this.withCredentials}
${this.text.substr(match.index + match[0].length + 1)}`;
  }

  private clearUrl(): void {
    this.url = this.url.trim()
      .toLowerCase();
    const match: RegExpExecArray = /\/+$/.exec(this.url);
    if (match) {
      this.url = this.url.substr(0, match.index);
    }
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html>

<head>
    <link rel="stylesheet" type="text/css"
        href="${this.url}/web/js/portal/jquery-ui-1.9.0.custom/css/smoothness/jquery-ui-1.9.1.custom.min.css">
    <link rel="stylesheet" type="text/css" href="${this.url}/web/css/portal/charts.min.css">
    <script type="text/javascript" src="${this.url}/web/js/portal/portal_init.js"></script>
    <script>
        if (typeof initializePortal === "function") {
            initializePortal(function (callback) {
                var configText = ${JSON.stringify(this.text)};
                if (typeof callback === "function") {
                    callback([configText, portalPlaceholders = getPortalPlaceholders()]) ;
                }
            });
        }
    </script>
    <script type="text/javascript"
        src="${this.url}/web/js/portal/jquery-ui-1.9.0.custom/js/jquery-1.8.2.min.js"></script>
    <script type="text/javascript"
            src="${this.url}/web/js/portal/jquery-ui-1.9.0.custom/js/jquery-ui-1.9.0.custom.min.js"></script>
    <script type="text/javascript" src="${this.url}/web/js/portal/d3.min.js"></script>
    <script type="text/javascript" src="${this.url}/web/js/portal/highlight.pack.js"></script>
    <script type="text/javascript" src="${this.url}/web/js/portal/charts.min.js"></script>
</head>

<body onload="onBodyLoad()">
    <div class="portalView"></div>
    <div id="dialog"></div>
</body>

</html>`;
  }

  private replaceImports(): void {
    const address: string = (/\//.test(this.url)) ? `${this.url}/portal/resource/scripts/` : this.url;
    const regexp: RegExp = /(^\s*import\s+\S+\s*=\s*)(\S+)\s*$/mg;
    const urlPosition: number = 2;
    let match: RegExpExecArray = regexp.exec(this.text);
    while (match) {
      const external: string = match[urlPosition];
      if (!/\//.test(external)) {
        this.text = this.text.substr(0, match.index + match[1].length) +
          address + external + this.text.substr(match.index + match[0].length);
      }
      match = regexp.exec(this.text);
    }
  }

}

const deleteComments: (text: string) => string = (text: string): string => {
  let content: string = text;
  const multiLine: RegExp = /\/\*[\s\S]*?\*\//g;
  const oneLine: RegExp = /^[ \t]*#.*/mg;
  let i: RegExpExecArray = multiLine.exec(content);
  if (!i) {
    i = oneLine.exec(content);
  }

  while (i) {
    let spaces: string = " ";
    for (let j: number = 1; j < i[0].length; j++) {
      spaces += " ";
    }
    const newLines: number = i[0].split("\n").length - 1;
    for (let j: number = 0; j < newLines; j++) {
      spaces += "\n";
    }
    content = content.substring(0, i.index) + spaces +
      content.substring(i.index + i[0].length);
    i = multiLine.exec(content);
    if (!i) {
      i = oneLine.exec(content);
    }
  }

  return content;
};
