import * as path from "path";

import {
    commands, Disposable, ExtensionContext, TextDocument, TextEditor, ViewColumn, WebviewPanel,
    window, workspace,
} from "vscode";

import {
    ForkOptions, LanguageClient, LanguageClientOptions, ServerOptions, TransportKind,
} from "vscode-languageclient";

let client: LanguageClient;

export const activate: (context: ExtensionContext) => void = (context: ExtensionContext): void => {

    // The server is implemented in node
    const serverModule: string = context.asAbsolutePath(path.join("server", "out", "server.js"));
    // The debug options for the server
    const debugOptions: ForkOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

    const tabSize: number = 2;
    workspace.getConfiguration()
        .update("editor.tabSize", tabSize);
    workspace.getConfiguration()
        .update("editor.insertSpaces", true);

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        debug: { module: serverModule, options: debugOptions, transport: TransportKind.ipc },
        run: { module: serverModule, transport: TransportKind.ipc },
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for plain text documents
        documentSelector: [{ language: "axibasecharts", scheme: "file" }],
        synchronize: {
            // Notify the server about file changes to ".clientrc files contain in the workspace
            fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
        },
    };

    // Create the language client and start the client.
    client = new LanguageClient("axibaseCharts", "Axibase Charts", serverOptions, clientOptions);

    // Start the client. This will also launch the server
    client.start();
    const preview: PreviewShower = new PreviewShower();
    const disposable: Disposable = commands.registerTextEditorCommand(preview.id, preview.showPreview, preview);
    context.subscriptions.push(disposable);

};

export const deactivate: () => Thenable<void> = (): Thenable<void> => {
    if (!client) {
        return undefined;
    }

    return client.stop();
};

class PreviewShower {
    public readonly id: string = "axibasecharts.showPortal";
    public showPreview: (editor: TextEditor) => void = async (editor: TextEditor): Promise<void> => {
        const document: TextDocument = editor.document;

        let url: string = workspace.getConfiguration("axibaseCharts", document.uri)
            .get("axibaseCharts.url");
        if (!url) {
            url = await window.showInputBox(
                { ignoreFocusOut: true, prompt: "Please, enter the ATSD url" },
            );
            if (!url) {
                return;
            }
        }
        let username: string = workspace.getConfiguration("axibaseCharts", document.uri)
            .get("axibaseCharts.username");
        let withCredentials: string = url;
        if (!username) {
            username = await window.showInputBox(
                { ignoreFocusOut: true, prompt: "Please, enter the ATSD username" },
            );
        }
        if (username) {
            const password: string = await window.showInputBox(
                { ignoreFocusOut: true, password: true, prompt: "Please, enter the ATSD password" },
            );
            if (!password) {
                return;
            }
            withCredentials = addCredentials(url, username, password);
        }

        const panel: WebviewPanel = window.createWebviewPanel("portal", "Portal", ViewColumn.Beside, {
            enableCommandUris: true, enableScripts: true, retainContextWhenHidden: true,
        });
        panel.title = `Preview ${previewName(document.fileName)}`;
        const configuration: string = addUrl(replaceImports(document.getText(), url), withCredentials);
        panel.webview.html = `<!DOCTYPE html>
<html>

<head>
    <link rel="stylesheet" type="text/css"
        href="${url}/web/js/portal/jquery-ui-1.9.0.custom/css/smoothness/jquery-ui-1.9.1.custom.min.css">
    <link rel="stylesheet" type="text/css" href="${url}/web/css/portal/charts.min.css">
    <script type="text/javascript" src="${url}/web/js/portal/portal_init.js"></script>
    <script>
        if (typeof initializePortal === "function") {
            initializePortal(function (callback) {
                var configText = ${JSON.stringify(configuration)};
                if (typeof callback === "function") {
                    callback([configText, portalPlaceholders = getPortalPlaceholders()]) ;
                }
            });
        }
    </script>
    <script type="text/javascript" src="${url}/web/js/portal/jquery-ui-1.9.0.custom/js/jquery-1.8.2.min.js"></script>
    <script type="text/javascript"
            src="${url}/web/js/portal/jquery-ui-1.9.0.custom/js/jquery-ui-1.9.0.custom.min.js"></script>
    <script type="text/javascript" src="${url}/web/js/portal/d3.min.js"></script>
    <script type="text/javascript" src="${url}/web/js/portal/highlight.pack.js"></script>
    <script type="text/javascript" src="${url}/web/js/portal/charts.min.js"></script>
</head>

<body onload="onBodyLoad()">
    <div class="portalView"></div>
    <div id="dialog"></div>
</body>

</html>`;
        console.log(panel.webview.html);
    }
}

const replaceImports: (text: string, url: string) => string = (text: string, url: string): string => {
    if (url === undefined) {
        return text;
    }
    const address: string = (/\//.test(url)) ? `${url}/portal/resource/scripts/` : url;
    const regexp: RegExp = /(^\s*import\s+\S+\s*=\s*)(\S+)\s*$/mg;
    const urlPosition: number = 2;
    let modifiedText: string = text;
    let match: RegExpExecArray = regexp.exec(modifiedText);
    while (match) {
        const external: string = match[urlPosition];
        if (!/\//.test(external)) {
            modifiedText = modifiedText.substr(0, match.index + match[1].length) +
                address + external + modifiedText.substr(match.index + match[0].length);
        }
        match = regexp.exec(modifiedText);
    }

    return modifiedText;
};

const addUrl: (text: string, url: string) => string = (text: string, url: string): string => {
    if (url === undefined) {
        return text;
    }
    let result: string = text;
    let withoutComments: string = deleteComments(text);
    let match: RegExpExecArray = /^[ \t]*\[configuration\]/mi.exec(withoutComments);
    if (match === null) {
        match = /\S/.exec(withoutComments);
        if (match === null) {
            return text;
        }
        result =
            `${result.substr(0, match.index - 1)}[configuration]\n  ${result.substr(match.index)}`;
        withoutComments = deleteComments(result);
        match = /^[ \t]*\[configuration\]/i.exec(withoutComments);
    }
    result =
        `${result.substr(0, match.index + match[0].length + 1)}  url = ${url}
${result.substr(match.index + match[0].length + 1)}`;

    return result;
};

const addCredentials: (url: string, username: string, password: string) => string =
    (url: string, username: string, password: string): string => {
        if (url === undefined) {
            return url;
        }
        const match: RegExpExecArray = /https?:\/\//.exec(url);
        if (match === null) {
            return url;
        }

        return `${match[0]}${username}:${password}@${url.substr(match.index + match[0].length)}`;
    };

const previewName: (fullName: string) => string =
    (fullName: string): string => fullName.substr(fullName.lastIndexOf("/") + 1);

const deleteComments: (text: string) => string = (text: string): string => {
    let content: string = text;
    const multiLine: RegExp = /\/\*[\s\S]*?\*\//g;
    const oneLine: RegExp = /^[ \t]*#.*/mg;
    let i: RegExpExecArray = multiLine.exec(content);
    if (!i) { i = oneLine.exec(content); }

    while (i) {
        let spaces: string = " ";
        for (let j: number = 1; j < i[0].length; j++) { spaces += " "; }
        const newLines: number = i[0].split("\n").length - 1;
        for (let j: number = 0; j < newLines; j++) { spaces += "\n"; }
        content = content.substring(0, i.index) + spaces +
            content.substring(i.index + i[0].length);
        i = multiLine.exec(content);
        if (!i) { i = oneLine.exec(content); }
    }

    return content;
};
