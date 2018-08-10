import * as path from "path";

import {
    commands, Disposable, ExtensionContext, TextDocument, TextEditor, ViewColumn, WebviewPanel, window, workspace,
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
    public showPreview: (editor: TextEditor) => void = (editor: TextEditor): void => {
        const document: TextDocument = editor.document;
        const url: string = findUrl(document.getText());
        const panel: WebviewPanel = window.createWebviewPanel("portal", "Portal", ViewColumn.Beside, {
            enableScripts: true,
        });
        panel.title = `Preview ${previewName(document.fileName)}`;
        if (url === undefined) {
            panel.webview.html = errorWebview;

            return;
        }
        panel.webview.html =
            `<!DOCTYPE html>
<html>

<head>
    <link rel="stylesheet" type="text/css"
        href="${url}/web/js/portal/jquery-ui-1.9.0.custom/css/smoothness/jquery-ui-1.9.1.custom.min.css">
    <link rel="stylesheet" type="text/css" href="${url}/web/css/portal/charts.min.css">
    <script type="text/javascript" src="${url}/web/js/portal/portal_init.js"></script>
    <script>
        if (typeof initializePortal === "function") {
            initializePortal(function (callback) {
                var configText = ${JSON.stringify(replaceImports(document.getText()))};
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
    }
}

const replaceImports: (text: string) => string = (text: string): string => {
    let url: string = findUrl(text);
    if (url === undefined) {
        return text;
    } else {
        url += "/portal/resource/scripts/";
    }
    const regexp: RegExp = /(^\s*import\s+\S+\s*=\s*)(\S+)\s*$/mg;
    const urlPosition: number = 2;
    let modifiedText: string = text;
    let match: RegExpExecArray = regexp.exec(modifiedText);
    while (match) {
        const external: string = match[urlPosition];
        if (!/\//.test(external)) {
            modifiedText = modifiedText.substr(0, match.index + match[1].length) +
                url + external + modifiedText.substr(match.index + match[0].length);
        }
        match = regexp.exec(modifiedText);
    }

    return modifiedText;
};

const findUrl: (text: string) => string | undefined = (text: string): string | undefined => {
    const regexp: RegExp = /^\s*url\s*=\s*(\S+?(?=\/?\s*$))/m;
    const match: RegExpExecArray = regexp.exec(text);
    if (match) {
        return `${match[1]}`;
    } else {
        return undefined;
    }
};

const previewName: (fullName: string) => string =
    (fullName: string): string => fullName.substr(fullName.lastIndexOf("/") + 1);

const errorWebview: string = `<!DOCTYPE html>
<html>
    <head><title>Error preview</title></head>
    <body>
        To get preview specify the ATSD instance address via "url = {address}" setting in [configuration] section
    </body>
</html>`;
