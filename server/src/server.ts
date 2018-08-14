import {
    ClientCapabilities, CompletionItem, CompletionParams, createConnection, Diagnostic,
    DidChangeConfigurationNotification, DidChangeConfigurationParams,
    DocumentFormattingParams, IConnection, InitializeParams, ProposedFeatures,
    TextDocument, TextDocumentChangeEvent, TextDocuments, TextEdit,
} from "vscode-languageserver";
import { CompletionProvider } from "./completionProvider";
import { Formatter } from "./formatter";
import { JsDomCaller } from "./jsDomCaller";
import { Validator } from "./validator";

// Create a connection for the server. The connection uses Node"s IPC as a transport.
// Also include all preview / proposed LSP features.
const connection: IConnection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
    const capabilities: ClientCapabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we will fall back using global settings
    hasConfigurationCapability = capabilities.workspace && !!capabilities.workspace.configuration;

    return {
        capabilities: {
            completionProvider: { resolveProvider: true },
            documentFormattingProvider: true,
            textDocumentSync: documents.syncKind,
        },
    };
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
});

interface IServerSettings {
    validateFunctions: boolean;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
const defaultSettings: IServerSettings = { validateFunctions: false };
let globalSettings: IServerSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<IServerSettings>> = new Map();

connection.onDidChangeConfiguration((change: DidChangeConfigurationParams) => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    } else {
        globalSettings = (
            (change.settings.axibaseCharts || defaultSettings)
        ) as IServerSettings;
    }

    // Revalidate all open text documents
    documents.all()
        .forEach(validateTextDocument);
});

const getDocumentSettings: (resource: string) => Thenable<IServerSettings> =
    (resource: string): Thenable<IServerSettings> => {
        if (!hasConfigurationCapability) {
            return Promise.resolve(globalSettings);
        }
        let result: Thenable<IServerSettings> = documentSettings.get(resource);
        if (!result) {
            result = connection.workspace.getConfiguration({
                scopeUri: resource,
                section: "axibaseCharts",
            });
            documentSettings.set(resource, result);
        }

        return result;
    };

// Only keep settings for open documents
documents.onDidClose((e: TextDocumentChangeEvent) => {
    documentSettings.delete(e.document.uri);
});

documents.onDidChangeContent((change: TextDocumentChangeEvent) => {
    validateTextDocument(change.document);
});

const validateTextDocument: (textDocument: TextDocument) => Promise<void> =
    async (textDocument: TextDocument): Promise<void> => {
        const settings: IServerSettings = await getDocumentSettings(textDocument.uri);
        const text: string = textDocument.getText();
        const validator: Validator = new Validator(text);
        const jsDomCaller: JsDomCaller = new JsDomCaller(text);
        const diagnostics: Diagnostic[] = validator.lineByLine();

        if (settings.validateFunctions) {
            jsDomCaller.validate()
                .forEach((element: Diagnostic) => {
                    diagnostics.push(element);
                });
        }

        // Send the computed diagnostics to VSCode.
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    };

connection.onDocumentFormatting((params: DocumentFormattingParams): TextEdit[] => {
    const text: string = documents.get(params.textDocument.uri)
        .getText();
    const formatter: Formatter = new Formatter(text, params.options);

    return formatter.lineByLine();
});

connection.onCompletion((params: CompletionParams): CompletionItem[] => {
    const textDocument: TextDocument = documents.get(params.textDocument.uri);
    const completionProvider: CompletionProvider = new CompletionProvider(textDocument, params.position);

    return completionProvider.getCompletionItems();
});

connection.onCompletionResolve((item: CompletionItem): CompletionItem => item);

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();
