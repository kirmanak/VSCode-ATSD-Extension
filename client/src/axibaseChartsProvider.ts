import { ClientRequest, IncomingMessage, OutgoingMessage, request as http, RequestOptions } from "http";
import { request as https } from "https";
import { URL } from "url";
import {
    Event, EventEmitter, TextDocument, TextDocumentContentProvider, TextEditor,
    Uri, window,
} from "vscode";

export class AxibaseChartsProvider implements TextDocumentContentProvider {
    private auth: boolean;
    private cookie: string;
    private readonly onDidChangeEmitter: EventEmitter<Uri>;
    private password: string;
    private text: string;
    private url: string;
    private username: string;
    private withCredentials: string;

    public get onDidChange(): Event<Uri> {
        return this.onDidChangeEmitter.event;
    }

    public constructor(url: string, username?: string, password?: string) {
        this.onDidChangeEmitter = new EventEmitter<Uri>();
        this.url = url;
        if (username && password) {
            this.auth = true;
            this.username = username;
            this.password = password;
        } else {
            this.auth = false;
            this.withCredentials = this.url;
        }
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
        this.clearUrl();
        this.replaceImports();

        if (this.auth && !this.cookie) {
            try {
                [this.withCredentials, this.cookie] = await this.performRequest(this.username, this.password);
                if (new URL(this.withCredentials).pathname.includes("login")) {
                    const errorMessage: string = "Credentials are incorrect";
                    window.showErrorMessage(errorMessage);

                    return Promise.reject(errorMessage);
                }
            } catch (err) {
                window.showErrorMessage(err);

                return Promise.reject(err);
            } finally {
                this.username = undefined;
                this.password = undefined;
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
	<style>
	  .portalPage body {
		padding: 0;
		background: var(--vscode-editor-background);
	  }
	</style>
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
    let match: RegExpExecArray = multiLine.exec(content);
    if (!match) {
        match = oneLine.exec(content);
    }

    while (match) {
        const newLines: number = match[0].split("\n").length - 1;
        const spaces: string = Array(match[0].length)
            .fill(" ")
            .concat(
                Array(newLines)
                    .fill("\n"),
            )
            .join("");
        content = `${content.substr(0, match.index)}${spaces}${content.substr(match.index + match[0].length)}`;
        match = multiLine.exec(content);
        if (!match) {
            match = oneLine.exec(content);
        }
    }

    return content;
};
