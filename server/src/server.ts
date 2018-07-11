'use strict';

import {
	createConnection, TextDocuments, TextDocument, Diagnostic,
	ProposedFeatures, InitializeParams, DidChangeConfigurationNotification
} from 'vscode-languageserver';
import * as jsDomCaller from './jsdomCaller';

import * as validateFunctions from './validateFunctions';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
const documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we will fall back using global settings
	hasConfigurationCapability = capabilities.workspace && !!capabilities.workspace.configuration;
	hasWorkspaceFolderCapability = capabilities.workspace && !!capabilities.workspace.workspaceFolders;

	return {
		capabilities: {
			textDocumentSync: documents.syncKind
		}
	}
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders((_event) => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

/*
documents.onDidSave((listener) => {
	const textDocument = listener.document;
	const diagnostics = jsDomCaller.validate(textDocument, isRelatedInfoSupported);

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
});
*/

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
	const textDocument = change.document;
	const diagnostics = validateTextDocument(change.document);

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
});

function validateTextDocument(textDocument: TextDocument) {
	const diagnostics: Diagnostic[] = [];

	validateFunctions.lineByLine(textDocument).forEach(element => {
		diagnostics.push(element);
	});
	jsDomCaller.validate(textDocument).forEach(element => {
		diagnostics.push(element);
	});

	return diagnostics;
}


connection.onDidChangeWatchedFiles((_change) => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
