import {
    createConnection, Diagnostic, DidChangeConfigurationNotification, DocumentFormattingParams,
    InitializeParams, ProposedFeatures, TextDocument, TextDocuments, TextEdit,
} from "vscode-languageserver/lib/main";
import * as formatFunctions from "./formatFunctions";
import * as jsDomCaller from "./jsdomCaller";
import Validator from "./Validator";

// Create a connection for the server. The connection uses Node"s IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
const documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we will fall back using global settings
    hasConfigurationCapability = capabilities.workspace && !!capabilities.workspace.configuration;

    return {
        capabilities: {
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
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: IServerSettings = { validateFunctions: false };
let globalSettings: IServerSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<IServerSettings>> = new Map();

connection.onDidChangeConfiguration((change) => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    } else {
        globalSettings = (
            (change.settings.axibaseCharts || defaultSettings)
        ) as IServerSettings;
    }

    // Revalidate all open text documents
    documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<IServerSettings> {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: "axibaseCharts",
        });
        documentSettings.set(resource, result);
    }
    return result;
}

// Only keep settings for open documents
documents.onDidClose((e) => {
    documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
    validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    const settings = await getDocumentSettings(textDocument.uri);
    const validator = new Validator(textDocument);
    const diagnostics: Diagnostic[] = validator.lineByLine();

    if (settings.validateFunctions) {
        jsDomCaller.validate(textDocument).forEach((element) => {
            diagnostics.push(element);
        });
    }

    // Send the computed diagnostics to VSCode.
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDocumentFormatting((params: DocumentFormattingParams): TextEdit[] => {
    const edits: TextEdit[] = [];
    const document = documents.get(params.textDocument.uri);
    formatFunctions.extraTextSectionLine(document).forEach((edit) => {
        edits.push(edit);
    });

    return edits;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
