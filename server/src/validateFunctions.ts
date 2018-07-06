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

const dictionary: string[] = [
	"widget", "series", "configuration", "threshold", "starttime",
	"node", "start-time", "link", "tags", "group", "endtime",
	"id", "label", "alias", "value", "type", "offset-left", "options",
	"tooltip", "left-units", "top-units", "time-span", "pointer-position",
	"ahead-time-span", "colors", "legend-position", "color-range",
	"scale", "scale-x", "scale-y", "min-range", "max-range", "change-field",
	"min-range-right", "max-range-right", "min-range-force",
	"max-range-force", "min-range-right-force", "rotate-ticks",
	"max-range-right-force", "centralize-ticks", "centralize-columns",
	"axis-title", "axis-title-right", "style", "header-style", "class",
	"markers", "format", "label-format", "day-format", "cache", "limit",
	"audio-onload", "display-panels", "expand-panels", "metric", "table",
	"attribute", "entity", "entities", "entity-group", "entity-expression",
	"tag-expression", "statistic", "period", "align", "interpolate",
	"interpolate-extend", "rate", "rate-counter", "replace-value", "disconnect-interval",
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
	"server-aggregate", "step-line", "nodes", "links", "summarize-period", "disconnect-count",
	"dropdown", "offset-top", "offset-bottom", "last-marker", "time-offset", "legend-value"
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
	const bothRegex = /(^\s*\[)(\w+)\]|(^\s*)(\S+)\s*=/gm;
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
	public static parseControlSequence(line: string, i: number): FoundKeyword | null {
		const regex = /\b(for|endfor|if|elseif|else|endif|script|endscript|list|endlist)\b/;
		const match = regex.exec(line);
		if (match === null) return null;
		return {
			keyword: ControlSequenceUtil.toSequence(match[1]),
			range: { start: { line: i, character: match.index }, end: { line: i, character: match.index + match[0].length } }
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
			default: throw "Update control sequence switch-case!";
		}
	}
}


export function lineByLine(textDocument: TextDocument): Diagnostic[] {
	const result: Diagnostic[] = [];
	const lines: string[] = textDocument.getText().split('\n');
	const nestedStack: FoundKeyword[] = [];
	let isScript = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const foundKeyword = ControlSequenceUtil.parseControlSequence(line, i);
		if (foundKeyword === null) continue;
		switch (foundKeyword.keyword) {
			case ControlSequence.EndIf: {
				const sequence = nestedStack.pop();
				if (sequence === undefined) {
					result.push(Shared.createDiagnostic(
						{ uri: textDocument.uri, range: foundKeyword.range },
						DiagnosticSeverity.Error, `${foundKeyword.keyword} has no matching ${ControlSequence.If}`
					));
				} else if (sequence.keyword !== ControlSequence.If) {
					const ifIndex = nestedStack.findIndex((value) => {
						return value.keyword === ControlSequence.If;
					});
					nestedStack.push(sequence);
					if (ifIndex === -1) {
						result.push(Shared.createDiagnostic(
							{ uri: textDocument.uri, range: foundKeyword.range },
							DiagnosticSeverity.Error, "endif has no matching if"
						));
					} else {
						delete nestedStack[ifIndex];
						result.push(Shared.createDiagnostic(
							{ uri: textDocument.uri, range: foundKeyword.range },
							DiagnosticSeverity.Error, `if has finished before ${sequence.keyword}`
						));
					}
				}
				break;
			}
			case ControlSequence.EndFor: {
				const sequence = nestedStack.pop();
				if (sequence === undefined) {
					result.push(Shared.createDiagnostic(
						{ uri: textDocument.uri, range: foundKeyword.range },
						DiagnosticSeverity.Error, `${foundKeyword.keyword} has no matching ${ControlSequence.For}`
					));
				} else if (sequence.keyword !== ControlSequence.For) {
					const forIndex = nestedStack.findIndex((value) => {
						return value.keyword === ControlSequence.For;
					});
					nestedStack.push(sequence);
					if (forIndex === -1) {
						result.push(Shared.createDiagnostic(
							{ uri: textDocument.uri, range: foundKeyword.range },
							DiagnosticSeverity.Error, "endfor has no matching for"
						));
					} else {
						delete nestedStack[forIndex];
						result.push(Shared.createDiagnostic(
							{ uri: textDocument.uri, range: foundKeyword.range },
							DiagnosticSeverity.Error, `for has finished before ${sequence.keyword}`
						));
					}
				}
				break;
			}
			case ControlSequence.EndScript: {
				isScript = false;
				const sequence = nestedStack.pop();
				if (sequence === undefined || sequence.keyword !== ControlSequence.Script) {
					result.push(Shared.createDiagnostic(
						{ uri: textDocument.uri, range: foundKeyword.range },
						DiagnosticSeverity.Error, `${foundKeyword.keyword} has no matching ${ControlSequence.Script}`
					));
					if (sequence !== undefined) {
						nestedStack.push(sequence);
					}
				}
				break;
			}
			case ControlSequence.EndList: {
				const sequence = nestedStack.pop();
				if (sequence === undefined) {
					result.push(Shared.createDiagnostic(
						{ uri: textDocument.uri, range: foundKeyword.range },
						DiagnosticSeverity.Error, `${foundKeyword.keyword} has no matching ${ControlSequence.List}`
					));
				} else if (sequence.keyword !== ControlSequence.List) {
					nestedStack.push(sequence);
					result.push(Shared.createDiagnostic(
						{ uri: textDocument.uri, range: foundKeyword.range },
						DiagnosticSeverity.Error, "endlist has no matching list"
					));
				}
				break;
			}
			case ControlSequence.Else:
			case ControlSequence.ElseIf: {
				const sequence = nestedStack.pop();
				if (sequence === undefined) {
					result.push(Shared.createDiagnostic(
						{ uri: textDocument.uri, range: foundKeyword.range },
						DiagnosticSeverity.Error, `${foundKeyword.keyword} has no matching ${ControlSequence.If}`
					));
				} else {
					nestedStack.push(sequence);
					if (sequence.keyword !== ControlSequence.If) {
						const ifIndex = nestedStack.findIndex((value) => {
							return value.keyword === ControlSequence.If;
						});
						if (ifIndex === -1) {
							result.push(Shared.createDiagnostic(
								{ uri: textDocument.uri, range: foundKeyword.range },
								DiagnosticSeverity.Error, `${foundKeyword.keyword} has no matching ${ControlSequence.If}`
							));
						} else {
							result.push(Shared.createDiagnostic(
								{ uri: textDocument.uri, range: foundKeyword.range },
								DiagnosticSeverity.Error, `${foundKeyword.keyword} has started before ${sequence} has finished`
							));
						}
					}
				}
				break;
			}
			case ControlSequence.For: {
				if (isScript) continue;
				nestedStack.push(foundKeyword);
				break;
			}
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
				isScript = true;
				const scriptIndex = nestedStack.findIndex((value) => {
					return value.keyword === ControlSequence.Script;
				});
				if (scriptIndex !== -1) {
					nestedStack.push(foundKeyword);
				}
				break;
			}
		}
	}

	for (let i = 0; i < nestedStack.length; i++) {
		const sequence = nestedStack[i];
		switch (sequence.keyword) {
			case ControlSequence.For: {
				result.push(Shared.createDiagnostic(
					{ uri: textDocument.uri, range: sequence.range },
					DiagnosticSeverity.Error, `${sequence.keyword} has no matching ${ControlSequence.EndFor}`
				));
				break;
			}
			case ControlSequence.If: {
				result.push(Shared.createDiagnostic(
					{ uri: textDocument.uri, range: sequence.range },
					DiagnosticSeverity.Error, `${sequence.keyword} has no matching ${ControlSequence.EndIf}`
				));
				break;
			}
			case ControlSequence.Script: {
				result.push(Shared.createDiagnostic(
					{ uri: textDocument.uri, range: sequence.range },
					DiagnosticSeverity.Error, `${sequence.keyword} has no matching ${ControlSequence.EndScript}`
				));
				break;
			}
			case ControlSequence.List: {
				result.push(Shared.createDiagnostic(
					{ uri: textDocument.uri, range: sequence.range },
					DiagnosticSeverity.Error, `${sequence.keyword} has no matching ${ControlSequence.EndList}`
				));
				break;
			}
		}
	}

	return result;
}
