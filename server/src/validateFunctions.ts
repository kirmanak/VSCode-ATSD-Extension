import { Diagnostic, DiagnosticSeverity, TextDocument } from "vscode-languageserver/lib/main";

const diagnosticSource = "Axibase Visual Plugin";

export function nonExistentAliases(textDocument: TextDocument, hasDiagnosticRelatedInformationCapability: boolean): Diagnostic[] {
	const result: Diagnostic[] = [];

	const text = textDocument.getText();
	const aliasRegex = /alias\s*?=\s*?(\w[-\w\d_])/g;
	const deAliasRegex = /value\((['"])(.*)\1\)/g;

	let matching: RegExpExecArray;
	let aliases: String[] = [];

	while (matching = aliasRegex.exec(text)) {
		aliases.push(matching[1]);
	}

	while (matching = deAliasRegex.exec(text)) {
		const deAlias = matching[2];
		if (!aliases.find(alias => alias === deAlias)) {
			const deAliasStart = matching.index + 'value("'.length;
			const diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Error,
				range: {
					start: textDocument.positionAt(deAliasStart),
					end: textDocument.positionAt(deAliasStart + matching[2].length)
				},
				message: "Non-existent alias",
				source: diagnosticSource
			};
			if (hasDiagnosticRelatedInformationCapability) {
				diagnostic.relatedInformation = [
					{
						location: {
							uri: textDocument.uri,
							range: diagnostic.range
						},
						message: `The alias is referred, but never declared.`
					}
				];
			}
			result.push(diagnostic);
		}
	}

	return result;
}

export function unmatchedEndFor(textDocument: TextDocument, hasDiagnosticRelatedInformationCapability: boolean): Diagnostic[] {
	const result: Diagnostic[] = [];

	const text = textDocument.getText();
	const regexFor = /\bfor\b/g;
	const regexEndFor = /\bendfor\b/g;

	let matching: RegExpExecArray;

	while (matching = regexFor.exec(text)) {
		if (!regexEndFor.exec(text)) {
			const diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Error,
				range: {
					start: textDocument.positionAt(matching.index),
					end: textDocument.positionAt(matching.index + 3)
				},
				message: "For loop has no matching endfor",
				source: diagnosticSource
			};
			if (hasDiagnosticRelatedInformationCapability) {
				diagnostic.relatedInformation = [
					{
						location: {
							uri: textDocument.uri,
							range: diagnostic.range
						},
						message: `For keyword expects endfor keyword`
					}
				];
			}
			result.push(diagnostic);
		}
	}

	return result;
}

export function undefinedForVariables(textDocument: TextDocument, hasDiagnosticRelatedInformationCapability: boolean): Diagnostic[] {
	const result: Diagnostic[] = [];

	const text = textDocument.getText();
	const forPattern = /\bfor\s+?[-_\w\d]+?\s+?in\b|\bendfor\b|@\{[-_\w\d]+?\}/g;
	const forDeclaration = /\bfor\s+?([-_\w\d]+?)\s+?in\b/;
	const variablePattern = /@\{([-_\w\d]+?)\}/;
	const endForRegex = /\bendfor\b/;

	let matching: RegExpExecArray;
	let possibleVariables: string[] = [];
	while (matching = forPattern.exec(text)) {
		if (endForRegex.test(matching[0])) {
			if (possibleVariables.length != 0) possibleVariables.pop();
		} else if (variablePattern.test(matching[0])) {
			const foundVariable: string = variablePattern.exec(matching[0])[1];
			if (possibleVariables.find((value: string, _index: number, _array: string[]): boolean => {
				return foundVariable === value;
			}) === undefined) {
				let diagnostic: Diagnostic = {
					severity: DiagnosticSeverity.Error,
					range: {
						start: textDocument.positionAt(matching.index + 3),
						end: textDocument.positionAt(matching.index + 3 + foundVariable.length)
					},
					message: `${foundVariable} is undefined`,
					source: diagnosticSource
				};
				if (hasDiagnosticRelatedInformationCapability) {
					diagnostic.relatedInformation = [
						{
							location: {
								uri: textDocument.uri,
								range: diagnostic.range
							},
							message: `${foundVariable} is used in loop, but wasn't declared`
						}
					];
				}
				result.push(diagnostic);
			}
		} else if (forDeclaration.test(matching[0])) {
			const newVar = forDeclaration.exec(matching[0])[1];
			possibleVariables.push(newVar);
		}
	}

	return result;
}