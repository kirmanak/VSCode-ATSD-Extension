import { join } from "path";
import {
    commands, Disposable, ExtensionContext, TextDocument, Uri, ViewColumn, window, workspace, WorkspaceConfiguration,
} from "vscode";
import {
    ForkOptions, LanguageClient, LanguageClientOptions, ServerOptions, TransportKind,
} from "vscode-languageclient";
import { AxibaseChartsProvider } from "./axibaseChartsProvider";

let client: LanguageClient;

export const activate: (context: ExtensionContext) => void = async (context: ExtensionContext): Promise<void> => {

    // The server is implemented in node
    const serverModule: string = context.asAbsolutePath(join("server", "out", "server.js"));
    // The debug options for the server
    const debugOptions: ForkOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

    const tabSize: number = 2;
    const configuration: WorkspaceConfiguration = workspace.getConfiguration("editor");
    configuration.update("tabSize", tabSize);
    configuration.update("insertSpaces", true);

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
    const previewUri: string = "axibaseCharts://authority/axibaseCharts";
    const provider: AxibaseChartsProvider = new AxibaseChartsProvider();
    const registration: Disposable = workspace.registerTextDocumentContentProvider("axibaseCharts", provider);
    const saveListener: Disposable = workspace.onDidSaveTextDocument((document: TextDocument) => {
        if (document.uri === window.activeTextEditor.document.uri) {
            provider.update(Uri.parse(previewUri));
        }
    });
    const changeListener: Disposable = window.onDidChangeActiveTextEditor(() => {
        provider.update(Uri.parse(previewUri));
    });
    const disposable: Disposable = commands.registerCommand("axibasecharts.showPortal", () => {
        commands.executeCommand("vscode.previewHtml", previewUri, ViewColumn.Two, "Portal");
    });
    context.subscriptions.push(disposable, registration, saveListener, changeListener);
};

export const deactivate: () => Thenable<void> = (): Thenable<void> => {
    if (!client) {
        return undefined;
    }

    return client.stop();
};
