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
            const panel: WebviewPanel = window.createWebviewPanel("portal", "Portal", ViewColumn.Beside);
            panel.webview.html =
                `<!DOCTYPE HTML>
<html lang="en">
    <head><title>Preview ${document.fileName}</title></head>
    <body>${document.getText()}</body>
</html>`;
            panel.title = "My portal";
        }
}
