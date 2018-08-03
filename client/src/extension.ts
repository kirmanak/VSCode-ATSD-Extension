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
        documentSelector: [{ language: "axibase-charts", scheme: "file" }],
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
    public readonly id: string = "axibase-charts.showPortal";
    public showPreview: (editor: TextEditor) => void = (editor: TextEditor): void => {
        const document: TextDocument = editor.document;
        const panel: WebviewPanel = window.createWebviewPanel("portal", "Portal", ViewColumn.Beside, {
            enableScripts: true,
        });
        panel.webview.html =
            `<!DOCTYPE html>
<html>

<head>
    <title>Preview ${document.fileName}</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <link rel="stylesheet" type="text/css" href="https://apps.axibase.com/chartlab/portal/JavaScript/jquery-ui-1.9.0.custom/css/smoothness/jquery-ui-1.9.1.custom.min.css">
    <link rel="stylesheet" type="text/css" href="https://apps.axibase.com/chartlab/portal/CSS/charts.min.css">
    <script type="text/javascript" src="https://apps.axibase.com/chartlab/portal/JavaScript/portal_init.js"></script>
    <script>initializePortal(function () {
            var configText = \`${document.getText()}\`;
            return [configText, window.portalPlaceholders = getPortalPlaceholders()];
        });
    </script>
    <script type="text/javascript" src="https://apps.axibase.com/chartlab/portal/JavaScript/jquery-ui-1.9.0.custom/js/jquery-1.8.2.min.js"></script>
    <script type="text/javascript" src="https://apps.axibase.com/chartlab/portal/JavaScript/jquery-ui-1.9.0.custom/js/jquery-ui-1.9.0.custom.min.js"></script>
    <script type="text/javascript" src="https://apps.axibase.com/chartlab/portal/JavaScript/d3.min.js"></script>
    <script type="text/javascript" src="https://apps.axibase.com/chartlab/portal/JavaScript/highlight.pack.js"></script>
    <script type="text/javascript" src="https://apps.axibase.com/chartlab/portal/JavaScript/charts.min.js"></script>
</head>

<body onload="onBodyLoad()">
    <div class="portalView"></div>
    <div id="dialog"></div>
</body>

</html>`;
    }
}
