import { Location, Range, Diagnostic, DiagnosticSeverity, TextDocument } from 'vscode-languageserver';
import * as Shared from './sharedFunctions';
import * as Levenshtein from 'levenshtein';

export function nonExistentAliases(textDocument: TextDocument): Diagnostic[] {
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
				const location: Location = { 
					uri: textDocument.uri, 
					range: {
						start: textDocument.positionAt(deAliasStart),
						end: textDocument.positionAt(deAliasStart + matching[3].length)
					}
				};
				const diagnostic: Diagnostic = Shared.createDiagnostic(
					location, DiagnosticSeverity.Error, 
					`The alias ${deAlias} is reffered, but never declared`
				);
				result.push(diagnostic);
			}
		} else if (aliasRegex.test(line)) {
			aliases.push(matching[1]);
		}
	}

	return result;
}

export function unmatchedEndFor(textDocument: TextDocument): Diagnostic[] {
	const result: Diagnostic[] = [];

	const text = Shared.deleteComments(textDocument.getText());
	const regexFor = /\bfor\b/g;
	const regexEndFor = /\bendfor\b/g;

	let matching: RegExpExecArray;

	while (matching = regexFor.exec(text)) {
		if (!regexEndFor.exec(text)) {
			const location: Location = { 
				uri: textDocument.uri, 
				range: {
					start: textDocument.positionAt(matching.index),
					end: textDocument.positionAt(matching.index + 3)
				}
			};
			const diagnostic: Diagnostic = Shared.createDiagnostic(
				location, DiagnosticSeverity.Error, 
				"For loop has no matching endfor"
			);
			result.push(diagnostic);
		}
	}

	return result;
}

export function undefinedForVariables(textDocument: TextDocument): Diagnostic[] {
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
				const location: Location = { 
					uri: textDocument.uri, 
					range: {
						start: textDocument.positionAt(matching.index + 2),
						end: textDocument.positionAt(matching.index + 2 + foundVariable.length)
					}
				};
				const diagnostic: Diagnostic = Shared.createDiagnostic(
					location, DiagnosticSeverity.Error, 
					`${foundVariable} is used in loop, but wasn't declared`
				);
				result.push(diagnostic);
			}
		} else if (forDeclaration.test(matching[0])) {
			const newVar = forDeclaration.exec(matching[0])[1];
			possibleVariables.push(newVar);
		}
	}

	return result;
}

export function validateUnfinishedList(textDocument: TextDocument): Diagnostic[] {
	const result: Diagnostic[] = [];

	const text = Shared.deleteComments(textDocument.getText());
	const listDeclaration = /list.+=.+,\s*$/gm;
	const endList = /\bendlist\b/g;

	let matching: RegExpExecArray;

	while (matching = listDeclaration.exec(text)) {
		if (!endList.exec(text)) {
			const location: Location = { 
				uri: textDocument.uri, 
				range: {
					start: textDocument.positionAt(matching.index),
					end: textDocument.positionAt(matching.index + matching[0].length)
				}
			};
			const diagnostic: Diagnostic = Shared.createDiagnostic(
				location, DiagnosticSeverity.Error, 
				"list is not closed. Use 'endlist' keyword"
			);
			result.push(diagnostic);
		}
	}

	return result;
}

const dictionary: string[] = [
	"widget", "series", "configuration", "threshold", "starttime",
	"node", "start-time", "link", "tags", "group", "endtime",
	"id", "label", "alias", "value", "type", "offset-left",
	"tooltip", "left-units", "top-units", "time-span", "pointer-position",
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

export function spellingCheck(textDocument: TextDocument): Diagnostic[] {
	const result: Diagnostic[] = [];

	const text = Shared.deleteComments(textDocument.getText());
	const bothRegex = /(^\s*)\[(\w+)\]|(^\s*)(\S+)\s*=/gm;
	const sectionRegex = /\[\s*(\w+)\s*\]/g;
	let match: RegExpExecArray;
	let isTags = false;

	while (match = bothRegex.exec(text)) {
		if (/\[\s*tags\s*\]/g.exec(match[0])) {
			isTags = true;
		} else if (sectionRegex.test(match[0])) {
			isTags = false;
		}

		const word = (match[2]) ? match[2] : match[4];
		const indent = (match[1]) ? match[1] : match[3];
		const wordStart = (indent) ? match.index + indent.length : match.index;
		if (isAbsent(word) && !isTags) {
			const suggestion: string = lowestLevenshtein(word);
			const location: Location = { 
				uri: textDocument.uri, 
				range: {
					start: textDocument.positionAt(wordStart),
					end: textDocument.positionAt(wordStart + word.length)
				}
			};
			const diagnostic: Diagnostic = Shared.createDiagnostic(
				location, DiagnosticSeverity.Error, 
				`${word} is unknown. Did you mean ${suggestion}?`
			);
			result.push(diagnostic);
		}
	}

	return result;
}

export function ifValidation(textDocument: TextDocument): Diagnostic[] {
	const result: Diagnostic[] = [];

	const text = Shared.deleteComments(textDocument.getText());
	const regex = /\bif\b|\belseif\b|\belse\b|\bendif\b/g;
	let match: RegExpExecArray;
	let openedIfCounter = 0;
	let lastIf: Range;

	while (match = regex.exec(text)) {
		if (/\bif\b/.test(match[0])) {
			openedIfCounter++;
			lastIf = {
				start: textDocument.positionAt(match.index),
				end: textDocument.positionAt(match.index + match[0].length)
			};
		} else {
			if (openedIfCounter < 1) {
				const location: Location = { 
					uri: textDocument.uri, 
					range: {
						start: textDocument.positionAt(match.index),
						end: textDocument.positionAt(match.index + match[0].length)
					}
				};
				const diagnostic: Diagnostic = Shared.createDiagnostic(
					location, DiagnosticSeverity.Error, 
					`"${match[0]}" has no matching "if"`
				);
				result.push(diagnostic);
			} else if (/\bendif\b/.test(match[0])) {
				openedIfCounter--;
			}
		}
	}
	if (openedIfCounter !== 0) { 
		const location: Location = { uri: textDocument.uri, range: lastIf };
		const diagnostic: Diagnostic = Shared.createDiagnostic(
			location, DiagnosticSeverity.Error, 
			`"if" has no matching "endif"`
		);
		result.push(diagnostic);
	}

	return result;
}
