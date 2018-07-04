import { Diagnostic, DiagnosticSeverity, TextDocument } from "vscode-languageserver/lib/main";
import * as Shared from './sharedFunctions';
import * as Levenshtein from 'levenshtein';

const diagnosticSource = "Axibase Visual Plugin";

export function nonExistentAliases(textDocument: TextDocument, hasDiagnosticRelatedInformationCapability: boolean): Diagnostic[] {
	const result: Diagnostic[] = [];

	const text = Shared.deleteComments(textDocument.getText());
	const bothRegex = /alias\s*?=\s*?(\w[-\w\d_])|value\((['"])(.*)\2\)/g;
	const deAliasRegex = /value\((['"])(.*)\1\)/;
	const aliasRegex = /alias\s*?=\s*?(\w[-\w\d_])/;

	let matching: RegExpExecArray;
	let aliases: String[] = [];

	while (matching = bothRegex.exec(text)) {
		const line = matching[0];
		if (deAliasRegex.test(line)) {
			const deAlias = matching[3];
			if (!aliases.find(alias => alias === deAlias)) {
				const deAliasStart = matching.index + 'value("'.length;
				const diagnostic: Diagnostic = {
					severity: DiagnosticSeverity.Error,
					range: {
						start: textDocument.positionAt(deAliasStart),
						end: textDocument.positionAt(deAliasStart + matching[3].length)
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
		} else if (aliasRegex.test(line)) {
			aliases.push(matching[1]);
		}
	}

	return result;
}

export function unmatchedEndFor(textDocument: TextDocument, hasDiagnosticRelatedInformationCapability: boolean): Diagnostic[] {
	const result: Diagnostic[] = [];

	const text = Shared.deleteComments(textDocument.getText());
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

	const text = Shared.deleteComments(textDocument.getText());
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
				const diagnostic: Diagnostic = {
					severity: DiagnosticSeverity.Error,
					range: {
						start: textDocument.positionAt(matching.index + 2),
						end: textDocument.positionAt(matching.index + 2 + foundVariable.length)
					},
					message: `${foundVariable} is undefined`,
					source: diagnosticSource
				};
				if (hasDiagnosticRelatedInformationCapability) {
					diagnostic.relatedInformation = [{
						location: {uri: textDocument.uri, range: diagnostic.range },
						message: `${foundVariable} is used in loop, but wasn't declared`
					}];
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

export function validateUnfinishedList(textDocument: TextDocument, hasDiagnosticRelatedInformationCapability: boolean): Diagnostic[] {
	const result: Diagnostic[] = [];

	const text = Shared.deleteComments(textDocument.getText());
	const listDeclaration = /list.+=.+,\s*$/gm;
	const endList = /\bendlist\b/g;

	let matching: RegExpExecArray;

	while (matching = listDeclaration.exec(text)) { 
		if (!endList.exec(text)) {
			const diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Error,
				range: { 
					start: textDocument.positionAt(matching.index), 
					end: textDocument.positionAt(matching.index + matching[0].length) 
				},
				message: "list is not closed",
				source: diagnosticSource
			};
			if (hasDiagnosticRelatedInformationCapability) {
				diagnostic.relatedInformation = [{
					location: { uri: textDocument.uri, range: diagnostic.range },
					message: 'Delete comma or add endlist keyword'
				}];
			}
			result.push(diagnostic);
		}
	}

	return result;
}

const dictionary: string[] = [
	"widget", "series", "configuration",
	"node", "start-time", "link", "tags", "group",
	"id", "label", "alias", "value", "type", 
	"tooltip", "left-units", "top-units", "time-span",
	"ahead-time-span", "colors", "legend-position",
	"scale", "scale-x", "scale-y", "min-range", "max-range",
	"min-range-right", "max-range-right", "min-range-force",
	"max-range-force", "min-range-right-force", "rotate-ticks",
	"max-range-right-force", "centralize-ticks", "centralize-columns",
	"axis-title", "axis-title-right", "style", "header-style", "class",
	"markers", "format", "label-format", "day-format", "cache", "limit",
	"audio-onload", "display-panels", "expand-panels", "metric", "table",
	"attribute", "entity", "entities", "entity-group", "entity-expression",
	"tag-expression", "statistic", "period", "align", "interpolate", 
	"interpolate-extend", "rate", "rate-counter", "replace-value", 
	"data-type", "forecast-name", "style", "alias", "alert-expression", 
	"alert-style", "audio-alert", "group-keys", "group-statistic", "group-period",
	"group-first", "group-interpolate", "group-interpolate-extend", "series-limit",
	"exact-match", "merge-fields", "color", "axis", "format", "display", "enabled",
	"refresh-interval", "retry-refresh-interval", "error-refresh-interval",
	"width-units", "parent", "update-interval", "link-colors", "link-widths",
	"link-animate", "mode", "bundle", "link-thresholds", "title", "dialog-maximize",
	"display-panels", "expand-panels", "periods", "buttons", "timespan", "end-time",
	"timezone", "offset-right", "widgets-per-row", "url", "context-path", "method-path",
	"url-parameters", "update-interval", "batch-update", "batch-size", "height-units",
	"server-aggregate", "step-line", "nodes", "links"
];

function isAbsent(word: string): boolean {
	return dictionary.find((value: string) => {
		return value === word;
	}) === undefined;
}

function lowestLevenshtein(word: string): string {
	let min: number = new Levenshtein(dictionary[0], word).distance;
	let suggestion = dictionary[0];
	dictionary.forEach((value: string) => {
		const distance = new Levenshtein(value, word).distance;
		if (distance < min) {
			min = distance;
			suggestion = value;
		}
	});

	return suggestion;
}

export function spellingCheck(textDocument: TextDocument, hasDiagnosticRelatedInformationCapability: boolean): Diagnostic[] {
	const result: Diagnostic[] = [];

	const text = Shared.deleteComments(textDocument.getText());
	const bothRegex = /\[\s*(\w+)\s*\]|(\S+)\s*=/g;
	const sectionRegex = /\[\s*(\w+)\s*\]/g;
	let match: RegExpExecArray;
	let isTags = false;

	while (match = bothRegex.exec(text)) {
		if (/\[\s*tags\s*\]/g.exec(match[0])) {
			isTags = true;
		} else if (sectionRegex.test(match[0])) {
			isTags = false;
		}

		const word = (match[1]) ? match[1] : match[2];
		if (isAbsent(word) && !isTags) {
			const suggestion: string = lowestLevenshtein(word);
			let diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Warning,
				range: {
					start: textDocument.positionAt(match.index),
					end: textDocument.positionAt(match.index + word.length)
				},
				message: `${word} is unknown`,
				source: diagnosticSource
			};
			if (hasDiagnosticRelatedInformationCapability) {
				diagnostic.relatedInformation = [
					{
						location: {
							uri: textDocument.uri,
							range: diagnostic.range
						},
						message: `${word} is unknown. Did you mean ${suggestion}?`
					}
				];
			}
			result.push(diagnostic);
		}
	}

	return result;
}
