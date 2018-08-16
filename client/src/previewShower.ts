import { writeFile } from "fs";
import * as hash from "object-hash";
import { tmpdir } from "os";

import {
  commands, TextDocument, TextEditor, Uri, ViewColumn, window, workspace, WorkspaceConfiguration,
} from "vscode";

export class PreviewShower {
  public static readonly ID: string = "axibasecharts.showPortal";
  private password: string;
  private text: string;
  private URL: string;
  private username: string;
  private withCredentials: string;

  public async showPreview(editor: TextEditor): Promise<void> {
    const document: TextDocument = editor.document;
    this.text = deleteComments(document.getText());
    const fileName: string = document.fileName;
    const previewName: string = fileName.substr(fileName.lastIndexOf("/") + 1);
    const configuration: WorkspaceConfiguration = workspace.getConfiguration("axibaseCharts", document.uri);
    this.URL = configuration.get("url");
    if (!this.URL) {
      this.URL = await window.showInputBox({
        ignoreFocusOut: true, placeHolder: "http(s)://atsd_host:port",
        prompt: "Can be stored permamently in 'axibaseCharts.url' setting",
      });
      if (!this.URL) {
        return;
      }
    }
    this.clearUrl();
    this.replaceImports();

    this.username = configuration.get("username");
    if (!this.username) {
      this.username = await window.showInputBox({
        ignoreFocusOut: true, placeHolder: "username",
        prompt: "Specify only if API is closed for guests. Value can be stored in 'axibaseCharts.username'",
      });
    }
    if (this.username) {
      this.password = await window.showInputBox({
        ignoreFocusOut: true, password: true,
        prompt: "Please, enter the password. Can not be stored",
      });
      if (this.password) {
        this.addCredentials();
      }
    }
    if (!this.username || !this.password) {
      this.withCredentials = this.URL;
    }
    this.addUrl();

    const html: string = this.getHtml();
    // Use random to support several previews for files with same name, but in different folders
    const tmpPath: string = `${tmpdir()}/portal-${hash(fileName)}`;
    writeFile(tmpPath, html, { encoding: "utf8", flag: "w" }, () => {
      commands.executeCommand(
        "vscode.previewHtml", Uri.parse(`file://${tmpPath}`),
        ViewColumn.Two, `Preview ${previewName}`);
    });
  }

  private addCredentials(): void {
    const match: RegExpExecArray = /https?:\/\//i.exec(this.URL);
    this.withCredentials = (match) ?
      `${match[0]}${this.username}:${this.password}@${this.URL.substr(match.index + match[0].length)}` : this.URL;
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
    this.URL = this.URL.trim()
      .toLowerCase();
    const match: RegExpExecArray = /\/+$/.exec(this.URL);
    if (match) {
      this.URL = this.URL.substr(0, match.index);
    }
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html>

<head>
    <link rel="stylesheet" type="text/css"
        href="${this.URL}/web/js/portal/jquery-ui-1.9.0.custom/css/smoothness/jquery-ui-1.9.1.custom.min.css">
    <link rel="stylesheet" type="text/css" href="${this.URL}/web/css/portal/charts.min.css">
    <script type="text/javascript" src="${this.URL}/web/js/portal/portal_init.js"></script>
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
        src="${this.URL}/web/js/portal/jquery-ui-1.9.0.custom/js/jquery-1.8.2.min.js"></script>
    <script type="text/javascript"
            src="${this.URL}/web/js/portal/jquery-ui-1.9.0.custom/js/jquery-ui-1.9.0.custom.min.js"></script>
    <script type="text/javascript" src="${this.URL}/web/js/portal/d3.min.js"></script>
    <script type="text/javascript" src="${this.URL}/web/js/portal/highlight.pack.js"></script>
    <script type="text/javascript" src="${this.URL}/web/js/portal/charts.min.js"></script>
</head>

<body onload="onBodyLoad()">
    <div class="portalView"></div>
    <div id="dialog"></div>
</body>

</html>`;
  }

  private replaceImports(): void {
    const address: string = (/\//.test(this.URL)) ? `${this.URL}/portal/resource/scripts/` : this.URL;
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
