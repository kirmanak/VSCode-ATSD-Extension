import { ClientRequest, IncomingMessage, OutgoingMessage, request as http, RequestOptions } from "http";
import { request as https } from "https";
import { URL } from "url";
import {
  Event, EventEmitter, TextDocument, TextDocumentContentProvider, TextEditor,
  Uri, window, workspace, WorkspaceConfiguration,
} from "vscode";

export class AxibaseChartsProvider implements TextDocumentContentProvider {

  public get onDidChange(): Event<Uri> {
    return this.onDidChangeEmitter.event;
  }
  private auth: boolean = true;
  private cookie: string;
  private readonly onDidChangeEmitter: EventEmitter<Uri>;
  private text: string;
  private url: string;
  private withCredentials: string;

  public constructor() {
    this.onDidChangeEmitter = new EventEmitter<Uri>();
  }

  public async provideTextDocumentContent(): Promise<string> {
    const editor: TextEditor = window.activeTextEditor;
    if (!editor) {
      return Promise.reject();
    }
    const document: TextDocument = editor.document;
    if (document.languageId !== "axibasecharts") {
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

    if (this.auth && !this.cookie) {
      let username: string = configuration.get("username");
      if (!username) {
        username = await window.showInputBox({
          ignoreFocusOut: true, placeHolder: "username",
          prompt: "Specify only if API is closed for guests. Value can be stored in 'axibaseCharts.username'",
        });
      }
      let password: string;
      if (username) {
        password = await window.showInputBox({
          ignoreFocusOut: true, password: true,
          prompt: "Please, enter the password. Can not be stored",
        });
      }
      if (password && username) {
        try {
          [this.withCredentials, this.cookie] = await this.performRequest(username, password);
        } catch (err) {
          return Promise.reject(err);
        } finally {
          username = undefined;
          password = undefined;
        }
      } else {
        this.auth = false;
        this.withCredentials = this.url;
      }
    }
    this.addUrl();
    const html: string = this.getHtml();

    return html;
  }

  public update(uri: Uri): void {
    this.onDidChangeEmitter.fire(uri);
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
<script>
document.cookie = "${this.cookie}";
</script>
    <div class="portalView"></div>
    <div id="dialog"></div>
</body>

</html>`;
  }

  private async performRequest(username: string, password: string): Promise<[string, string]> {
    const url: URL = new URL(this.url);
    const data: string = `login=true&atsd_user=${username}&atsd_pwd=${password}&commit=Login`;
    const options: RequestOptions = {
      headers: {
        "Content-Length": data.length,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      hostname: url.hostname,
      method: "POST",
      path: "/login-processing",
      port: url.port,
      protocol: url.protocol,
    };
    const request: (options: RequestOptions | string | URL, callback?: (res: IncomingMessage) => void)
      => ClientRequest = (url.protocol === "https:") ? https : http;

    return new Promise<[string, string]>(
      (resolve: (value: [string, string]) => void, reject: (reason: Error) => void): void => {
        const outgoing: OutgoingMessage = request(options, (res: IncomingMessage) => {
          res.on("error", reject);
          const expectedStatusCode: number = 302;
          if (res.statusCode !== expectedStatusCode) {
            reject(new Error(`HTTP response code: ${res.statusCode}`));
          }
          const location: string = res.headers.location;
          const cookie: string = res.headers["set-cookie"].join(";");

          resolve([location, cookie]);
        });
        outgoing.on("error", reject);
        outgoing.write(data);
        outgoing.end();
      });
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
