import { Location, Range, Diagnostic, DiagnosticSeverity, TextDocument } from 'vscode-languageserver';
import * as Shared from './sharedFunctions';
import * as Levenshtein from 'levenshtein';

export function nonExistentAliases(textDocument: TextDocument): Diagnostic[] {
	const result: Diagnostic[] = [];

	const text = Shared.deleteComments(textDocument.getText());
	const bothRegex = /^[\t ]*alias[\t ]*=[\t ]*(\S*)[\t ]*$|^[ \t]*value[ \t]*=[ \t\S]*value\((['"])(\S*)\2\)[ \t\S]*$/gm;
	const deAliasRegex = /(^[ \t]*value[ \t]*=[ \t\S]*value\((['"]))(\S*)\2\)[ \t\S]*$/m;
	const aliasRegex = /^[\t ]*alias[\t ]*=[\t ]*(\S*)[\t ]*$/m;

	let matching: RegExpExecArray;
	let matchingDealias: RegExpExecArray;
	let aliases: String[] = [];

	while (matching = bothRegex.exec(text)) {
		const line = matching[0];
		if (matchingDealias = deAliasRegex.exec(line)) {
			const deAlias = matchingDealias[3];
			if (!aliases.find(alias => alias === deAlias)) {
				const deAliasStart = matching.index + matchingDealias[1].length;
				const location: Location = {
					uri: textDocument.uri,
					range: {
						start: textDocument.positionAt(deAliasStart),
						end: textDocument.positionAt(deAliasStart + matching[3].length)
					}
				};
				const diagnostic: Diagnostic = Shared.createDiagnostic(
					location, DiagnosticSeverity.Error,
					`The alias ${deAlias} is referred, but never declared`
				);
				result.push(diagnostic);
			}
		} else if (aliasRegex.test(line)) {
			aliases.push(matching[1]);
		}
	}

	return result;
}

export function undefinedForVariables(textDocument: TextDocument): Diagnostic[] {
	const result: Diagnostic[] = [];

	const text = Shared.deleteComments(textDocument.getText());
	const forPattern = /\bfor\s+\w[\w\d]*\s+in\b|\bendfor\b|@{.*?\w[\w\d]*.*}/g;
	const forDeclaration = /\bfor\s+(\w[\w\d]*)\s+in\b/;
	const variablePattern = /(\w[\w\d]+)/g;
	const endForRegex = /\bendfor\b/;

	let matching, match: RegExpExecArray;
	let possibleVariables: string[] = [];
	while (matching = forPattern.exec(text)) {
		if (endForRegex.test(matching[0])) {
			if (possibleVariables.length != 0) possibleVariables.pop();
		} else if (forDeclaration.test(matching[0])) {
			const newVar = forDeclaration.exec(matching[0])[1];
			possibleVariables.push(newVar);
		} else {
			while (match = variablePattern.exec(matching[0])) {
				const foundVariable: string = match[1];
				const index = possibleVariables.findIndex((value: string): boolean => {
					return (value === undefined) ? false : foundVariable === value;
				});
				if (index === -1) {
					const location: Location = {
						uri: textDocument.uri,
						range: {
							start: textDocument.positionAt(matching.index + match.index),
							end: textDocument.positionAt(matching.index + match.index + foundVariable.length)
						}
					};
					const diagnostic: Diagnostic = Shared.createDiagnostic(
						location, DiagnosticSeverity.Error,
						`${foundVariable} is used in loop, but wasn't declared`
					);
					result.push(diagnostic);
				}
			}
		}
	}

	return result;
}

const dictionary: string[] = [
	"ahead-time-span", "alert-expression", "alert-style", "alias", "align", "attribute",
	"audio-alert", "audio-onload", "axis", "axis-title", "axis-title-right", "batch-size",
	"batch-update", "bundle", "buttons", "cache", "centralize-columns", "centralize-ticks",
	"change-field", "class", "color", "color-range", "colors", "configuration", "context-path",
	"data-type", "day-format", "dialog-maximize", "disconnect-count", "disconnect-interval",
	"display", "display-panels", "dropdown", "enabled", "endtime", "end-time", "entities",
	"entity", "entity-expression", "entity-group", "error-refresh-interval", "exact-match",
	"expand-panels", "forecast-name", "format", "group", "group-first", "group-interpolate",
	"group-interpolate-extend", "group-keys", "group-period", "group-statistic", "header-style",
	"height-units", "id", "interpolate", "interpolate-extend", "label", "label-format", "last-marker",
	"left-units", "legend-position", "legend-value", "limit", "link", "link-animate", "link-colors",
	"links", "link-thresholds", "link-widths", "markers", "max-range", "max-range-force", "max-range-right",
	"max-range-right-force", "merge-fields", "method-path", "metric", "min-range", "min-range-force",
	"min-range-right", "min-range-right-force", "mode", "node", "nodes", "offset-bottom", "offset-left",
	"offset-right", "offset-top", "onchange", "options", "parent", "period", "periods", "pointer-position",
	"rate", "rate-counter", "refresh-interval", "replace-value", "retry-refresh-interval", "rotate-ticks",
	"scale", "scale-x", "scale-y", "series", "series-limit", "server-aggregate", "starttime", "start-time",
	"statistic", "step-line", "style", "summarize-period", "table", "tag-expression", "tags", "threshold",
	"time-offset", "timespan", "time-span", "timezone", "title", "tooltip", "top-units", "type",
	"update-interval", "url", "url-parameters", "value", "widget", "widgets-per-row", "width-units"
];

function isAbsent(word: string): boolean {
	return dictionary.find((value: string) => {
		return (value === undefined) ? false : value === word;
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

function spellingCheck(line: string, uri: string, i: number): Diagnostic[] {
	const result: Diagnostic[] = [];

	const bothRegex = /(^\s*\[)(\w+)\]|(^\s*)(\S+)\s*=/gm;
	let match: RegExpExecArray;

	while (match = bothRegex.exec(line)) {
		const word = (match[2]) ? match[2] : match[4];
		const indent = (match[1]) ? match[1] : match[3];
		const wordStart = (indent) ? match.index + indent.length : match.index;
		if (isAbsent(word)) {
			const suggestion: string = lowestLevenshtein(word);
			const location: Location = {
				uri: uri,
				range: {
					start: { line: i, character: wordStart },
					end: { line: i, character: wordStart + word.length }
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

enum ControlSequence {
	For = "for",
		EndFor = "endfor",
		If = "if",
		ElseIf = "elseif",
		Else = "else",
		EndIf = "endif",
		Script = "script",
		EndScript = "endscript",
		List = "list",
		EndList = "endlist"
}

class FoundKeyword {
	keyword: ControlSequence;
	range: Range;
}

class ControlSequenceUtil {
	public static createRegex(): RegExp {
		return /\b(endfor|elseif|endif|endscript|endlist|script|else|if|list|for)\b/g;
	}

	public static parseControlSequence(regex: RegExp, line: string, i: number): FoundKeyword | null {
		const match = regex.exec(line);
		if (match === null) return null;
		return {
			keyword: ControlSequenceUtil.toSequence(match[1]),
			range: { start: { line: i, character: match.index }, end: { line: i, character: match.index + match[1].length } }
		};
	}

	private static toSequence(word: string): ControlSequence {
		switch (word) {
			case "for": return ControlSequence.For;
			case "endfor": return ControlSequence.EndFor;
			case "if": return ControlSequence.If;
			case "elseif": return ControlSequence.ElseIf;
			case "else": return ControlSequence.Else;
			case "endif": return ControlSequence.EndIf;
			case "script": return ControlSequence.Script;
			case "endscrpt": return ControlSequence.EndScript;
			case "list": return ControlSequence.List;
			case "endlist": return ControlSequence.EndList;
			default: throw "Update control stackHead switch-case!";
		}
	}
}


export function lineByLine(textDocument: TextDocument): Diagnostic[] {
	const result: Diagnostic[] = [];
	const lines: string[] = Shared.deleteComments(textDocument.getText()).split('\n');
	const nestedStack: FoundKeyword[] = [];
	let isTags = false; // to disable spelling check
	let isScript = false; // to disable everything
	let match: RegExpExecArray;

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];

		// handle tags
		if (match = /\[tags\]/.exec(line)) isTags = true;
		else if (match = /\[\w+\]/.exec(line)) isTags = false;

		// prepare regex to let 'g' key do its work
		const regex = ControlSequenceUtil.createRegex();
		let foundKeyword = ControlSequenceUtil.parseControlSequence(regex, line, i);
		if (!isTags) spellingCheck(line, textDocument.uri, i).forEach((diagnostic) => {
			result.push(diagnostic);
		});

		while (foundKeyword !== null) {
			// handle scripts
			if (foundKeyword.keyword === ControlSequence.EndScript) {
				if (!isScript) {
					result.push(Shared.createDiagnostic(
						{ uri: textDocument.uri, range: foundKeyword.range }, DiagnosticSeverity.Error,
						`${foundKeyword.keyword} has no matching ${ControlSequence.Script}`
					));
				} else {
					isScript = false;
					const stackHead = nestedStack.pop();
					if (stackHead !== undefined && stackHead.keyword !== ControlSequence.Script) {
						nestedStack.push(stackHead);
						console.log("We've pushed something on the stack from script section");
						const scriptIndex = nestedStack.findIndex((value) => {
							return (value === undefined) ? false : value.keyword === ControlSequence.Script;
						});
						delete nestedStack[scriptIndex];
					}
				}
			} else if (isScript) continue;

			switch (foundKeyword.keyword) {
				case ControlSequence.EndIf: {
					const stackHead = nestedStack.pop();
					const ifIndex = nestedStack.findIndex((value) => {
						return (value === undefined) ? false : value.keyword === ControlSequence.If;
					});
					if (stackHead === undefined ||
						(stackHead.keyword !== ControlSequence.If && ifIndex === -1)) {
						if (stackHead !== undefined && stackHead.keyword !== ControlSequence.If)
						nestedStack.push(stackHead);
						result.push(Shared.createDiagnostic(
							{ uri: textDocument.uri, range: foundKeyword.range }, DiagnosticSeverity.Error,
							`${foundKeyword.keyword} has no matching ${ControlSequence.If}`
						));
					} else if (stackHead.keyword !== ControlSequence.If) {
						nestedStack.push(stackHead);
						delete nestedStack[ifIndex];
						result.push(Shared.createDiagnostic(
							{ uri: textDocument.uri, range: foundKeyword.range }, DiagnosticSeverity.Error,
							`${ControlSequence.If} has finished before ${stackHead.keyword}`
						));
					}
					break;
				}
				case ControlSequence.EndFor: {
					const stackHead = nestedStack.pop();
					const forIndex = nestedStack.findIndex((value) => {
						return (value === undefined) ? false : value.keyword === ControlSequence.For;
					});
					if (stackHead === undefined ||
						(stackHead.keyword !== ControlSequence.For && forIndex === -1)) {
						if (stackHead !== undefined) nestedStack.push(stackHead);
						result.push(Shared.createDiagnostic(
							{ uri: textDocument.uri, range: foundKeyword.range }, DiagnosticSeverity.Error,
							`${foundKeyword.keyword} has no matching ${ControlSequence.For}`
						));
					} else if (stackHead.keyword !== ControlSequence.For) {
						nestedStack.push(stackHead);
						delete nestedStack[forIndex];
						result.push(Shared.createDiagnostic(
							{ uri: textDocument.uri, range: foundKeyword.range }, DiagnosticSeverity.Error,
							`${ControlSequence.For} has finished before ${stackHead.keyword}`
						));
					}
					break;
				}
				case ControlSequence.EndList: {
					const stackHead = nestedStack.pop();
					if (stackHead === undefined || stackHead.keyword !== ControlSequence.List) {
						if (stackHead !== undefined) nestedStack.push(stackHead);
						result.push(Shared.createDiagnostic(
							{ uri: textDocument.uri, range: foundKeyword.range }, DiagnosticSeverity.Error,
							`${foundKeyword.keyword} has no matching ${ControlSequence.List}`
						));
					}
					break;
				}
				case ControlSequence.Else:
				case ControlSequence.ElseIf: {
					const stackHead = nestedStack.pop();
					const ifIndex = nestedStack.findIndex((value) => {
						return (value === undefined) ? false : value.keyword === ControlSequence.If;
					});
					if (stackHead === undefined ||
						(stackHead.keyword !== ControlSequence.If && ifIndex === -1)) {
						result.push(Shared.createDiagnostic(
							{ uri: textDocument.uri, range: foundKeyword.range }, DiagnosticSeverity.Error,
							`${foundKeyword.keyword} has no matching ${ControlSequence.If}`
						));
					} else if (stackHead.keyword !== ControlSequence.If) {
						result.push(Shared.createDiagnostic(
							{ uri: textDocument.uri, range: foundKeyword.range }, DiagnosticSeverity.Error,
							`${foundKeyword.keyword} has started before ${stackHead} has finished`
						));
					}
					nestedStack.push(stackHead);
					break;
				}
				case ControlSequence.For:
				case ControlSequence.If: {
					if (isScript) continue;
					nestedStack.push(foundKeyword);
					break;
				}
				case ControlSequence.List: {
					if (isScript) continue;
					if (/,[ \t]*$/m.test(line)) {
						nestedStack.push(foundKeyword);
					}
					break;
				}
				case ControlSequence.Script: {
					if (!isScript) {
						nestedStack.push(foundKeyword);
						isScript = true;
					}
					break;
				}
				default: throw "Update switch-case statement!";
			}

			foundKeyword = ControlSequenceUtil.parseControlSequence(regex, line, i);
		}
	}

	diagnosticForLeftKeywords(nestedStack, textDocument.uri).forEach((diagnostic) => {
		result.push(diagnostic);
	});

	return result;
}

function diagnosticForLeftKeywords(nestedStack: FoundKeyword[], uri: string): Diagnostic[] {
	const result: Diagnostic[] = [];
	for (let i = 0, length = nestedStack.length; i < length; i++) {
		const nestedConstruction = nestedStack[i];
		if (nestedConstruction === null || nestedConstruction === undefined) continue;
		switch (nestedConstruction.keyword) {
			case ControlSequence.For: {
				result.push(Shared.createDiagnostic(
					{ uri: uri, range: nestedConstruction.range }, DiagnosticSeverity.Error,
					`${nestedConstruction.keyword} has no matching ${ControlSequence.EndFor}`
				));
				break;
			}
			case ControlSequence.If: {
				result.push(Shared.createDiagnostic(
					{ uri: uri, range: nestedConstruction.range }, DiagnosticSeverity.Error,
					`${nestedConstruction.keyword} has no matching ${ControlSequence.EndIf}`
				));
				break;
			}
			case ControlSequence.Script: {
				result.push(Shared.createDiagnostic(
					{ uri: uri, range: nestedConstruction.range }, DiagnosticSeverity.Error,
					`${nestedConstruction.keyword} has no matching ${ControlSequence.EndScript}`
				));
				break;
			}
			case ControlSequence.List: {
				result.push(Shared.createDiagnostic(
					{ uri: uri, range: nestedConstruction.range }, DiagnosticSeverity.Error,
					`${nestedConstruction.keyword} has no matching ${ControlSequence.EndList}`
				));
				break;
			}
		}
	}

	return result;
}
