import { Location, Range, Diagnostic, DiagnosticSeverity, TextDocument } from 'vscode-languageserver';
import * as Shared from './sharedFunctions';
import * as Levenshtein from 'levenshtein';

const possibleOptions: string[] = [
	"addmeta", "aheadtimespan", "alertexpression", "alertstyle", "alias", "align",
	"attribute", "audioalert", "audioonload", "autoeperiod", "autoperiod", "autoscale",
	"axis", "axistitle", "axistitleright", "barcount", "batchsize", "batchupdate",
	"borderwidth", "bundle", "buttons", "cache", "caption", "captionstyle",
	"centralizecolumns", "centralizeticks", "changefield", "circle", "class", "color",
	"colorrange", "colors", "column", "columncategory", "columndescription",
	"columndisplaytype", "columnentity", "columnlabelformat", "columnmessage",
	"columnmetric", "columnmoderationstatus", "columnname", "columnnewbackend", "columnoid",
	"columnpublicationappendenabled", "columnpublicationdate", "columnpublicationgroup",
	"columnpublicationstage", "columnrowsupdatedby", "columnrule", "columnseverity",
	"columnsource", "columntableid", "columntags", "columntime", "columntype", "columnvalue",
	"columnviewtype", "context", "contextpath", "counter", "counterposition", "datatype",
	"dayformat", "dialogmaximize", "disconnectcount", "disconnectinterval", "disconnectvalue",
	"display", "displayinlegend", "displaypanels", "displayticks", "displaytip", "enabled",
	"endtime", "entities", "entity", "entityexpression", "entitygroup", "errorrefreshinterval",
	"exactmatch", "expandpanels", "expandtags", "fillvalue", "forecastname", "format", "formataxis",
	"formatcounter", "formatnumbers", "formattip", "gradientcount", "gradientintensity", "groupfirst",
	"groupinterpolate", "groupinterpolateextend", "groupkeys", "groupperiod", "groupstatistic", "half",
	"headerstyle", "heightunits", "hidecolumn", "horizontal", "horizontalgrid", "id", "interpolate",
	"interpolateboundary", "interpolateextend", "interpolatefill", "interpolatefunction",
	"interpolateperiod", "join", "key", "keys", "label", "labelformat", "last", "lastmarker", "leftunits",
	"legendposition", "legendvalue", "limit", "linkanimate", "linkcolorrange", "linkcolors", "linkdata",
	"links", "linkthresholds", "linkwidths", "margin", "markers", "maxrange", "maxrangeforce", "maxrangeright",
	"maxrangerightforce", "maxthreshold", "maxvalue", "mergecolumns", "mergefields", "methodpath", "metric",
	"metriclabel", "minorticks", "minrange", "minrangeforce", "minrangeright", "minrangerightforce", "minvalue",
	"mode", "movingaverage", "multipleseries", "name", "nodecolors", "nodeconnect", "nodelabels", "noderadius",
	"nodes", "nodethresholds", "offsetbottom", "offsetleft", "offsetright", "offsettop", "onchange", "onclick",
	"onseriesclick", "option", "options", "other", "padding", "parent", "path", "percentilemarkers",
	"percentiles", "period", "periods", "pointerposition", "properties", "property", "rate", "ratecounter",
	"refreshinterval", "reload", "replacevalue", "responsive", "retryrefreshinterval", "rightaxis", "rotateticks",
	"rowdisplay", "rowstyle", "scale", "scalex", "scaley", "script", "selectormode", "serieslabels", "serieslimit",
	"seriestype", "seriesvalue", "serveraggregate", "severitystyle", "singleentity", "size", "sort", "source",
	"stack", "starttime", "statistic", "statistics", "stepline", "style", "summarizeperiod", "table",
	"tagexpression", "tagsdropdowns", "tagsdropdownsstyle", "text", "thresholds", "ticks", "ticksright", "tickstime",
	"timeoffset", "timespan", "timezone", "title", "tooltip", "topaxis", "topunits", "totalvalue", "transpose",
	"type", "updateinterval", "url", "urlparameters", "value", "verticalgrid", "widgetsperrow", "widthunits"
];

const possibleSections: string[] = [
	"column", "configuration", "dropdown", "group", "keys", "link",
	"node", "option", "other", "properties", "property", "series",
	"tag", "tags", "threshold", "widget"
];

function lowestLevenshtein(word: string, dictionary: string[]): string {
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
		const withoutDash = word.replace(/-/g, '');
		const indent = (match[1]) ? match[1] : match[3];
		const wordStart = (indent) ? match.index + indent.length : match.index;
		let dictionary: string[];
		if (/\[\w+\]/.test(line)) dictionary = possibleSections;
		else dictionary = possibleOptions;
		if (!dictionary.find(value => value === withoutDash)) {
			const suggestion: string = lowestLevenshtein(withoutDash, dictionary);
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
	Csv = "csv",
	EndCsv = "endcsv",
	EndFor = "endfor",
	If = "if",
	ElseIf = "elseif",
	Else = "else",
	EndIf = "endif",
	Script = "script",
	EndScript = "endscript",
	List = "list",
	Var = "var",
	EndVar = "endvar",
	EndList = "endlist"
}

class FoundKeyword {
	keyword: ControlSequence;
	range: Range;
}

class ControlSequenceUtil {
	public static createRegex(): RegExp {
		return /\b(endvar|endcsv|endfor|elseif|endif|endscript|endlist|script|else|if|list|for|csv|var)\b/g;
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
			case "csv": return ControlSequence.Csv;
			case "endcsv": return ControlSequence.EndCsv;
			case "for": return ControlSequence.For;
			case "endfor": return ControlSequence.EndFor;
			case "if": return ControlSequence.If;
			case "elseif": return ControlSequence.ElseIf;
			case "else": return ControlSequence.Else;
			case "endif": return ControlSequence.EndIf;
			case "script": return ControlSequence.Script;
			case "endscript": return ControlSequence.EndScript;
			case "list": return ControlSequence.List;
			case "endlist": return ControlSequence.EndList;
			case "var": return ControlSequence.Var;
			case "endvar": return ControlSequence.EndVar;
			default: throw new Error("Update control stackHead switch-case!");
		}
	}
}

function countCsvColumns(line: string): number {
	const regex = /(['"]).+\1|[()-\w\d.]+/g;
	let counter = 0;
	while (regex.exec(line)) counter++;
	return counter;
}

function checkEnd(expectedEnd: ControlSequence, nestedStack: FoundKeyword[], foundKeyword: FoundKeyword, uri: string): Diagnostic | null {
	const stackHead = nestedStack.pop();
	if (stackHead !== undefined && stackHead.keyword === expectedEnd) return null;
	if (stackHead !== undefined) nestedStack.push(stackHead); // push found keyword back
	const unfinishedIndex = nestedStack.findIndex(value =>
		(value === undefined) ? false : value.keyword === expectedEnd
	);
	if (stackHead === undefined || unfinishedIndex === -1) {
		return Shared.createDiagnostic(
			{ uri: uri, range: foundKeyword.range }, DiagnosticSeverity.Error,
			`${foundKeyword.keyword} has no matching ${expectedEnd}`
		);
	} else {
		delete nestedStack[unfinishedIndex];
		return Shared.createDiagnostic(
			{ uri: uri, range: foundKeyword.range }, DiagnosticSeverity.Error,
			`${expectedEnd} has finished before ${stackHead.keyword}`
		);
	}
}

export function lineByLine(textDocument: TextDocument): Diagnostic[] {
	const result: Diagnostic[] = [];
	const lines: string[] = Shared.deleteComments(textDocument.getText()).split('\n');
	const nestedStack: FoundKeyword[] = [];
	let isTags = false; // to disable spelling check
	let isScript = false; // to disable everything
	let isCsv = false, isFor = false; // to perform validation
	let csvColumns = 0; // to validate csv
	const listNames: string[] = [], forVariables: string[] = []; // to validate @{var}
	const aliases: string[] = []; // to validate `value = value('alias')`
	const deAliasRegex = /(^\s*value\s*=.*value\((['"]))(\S*)\2\).*$/m;
	const aliasRegex = /^\s*alias\s*=\s*(\S*)\s*$/m;
	let match: RegExpExecArray;

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];

		// handle tags
		if (match = /\[tags\]/.exec(line)) isTags = true;
		else if (match = /\[\w+\]/.exec(line)) isTags = false;

		// prepare regex to let 'g' key do its work
		const regex = ControlSequenceUtil.createRegex();
		let foundKeyword = ControlSequenceUtil.parseControlSequence(regex, line, i);

		if (!isTags) {
			if (match = aliasRegex.exec(line)) aliases.push(match[1]);
			if (match = deAliasRegex.exec(line)) {
				const deAlias = match[3];
				if (!aliases.find(alias => alias === deAlias)) {
					console.log(match);
					const deAliasStart = match[1].length;
					result.push(Shared.createDiagnostic(
						{
							uri: textDocument.uri,
							range: {
								start: { line: i, character: deAliasStart },
								end: { line: i, character: deAliasStart + deAlias.length }
							}
						}, DiagnosticSeverity.Error, `The alias ${deAlias} is referred, but never declared`
					));
				}
			}
			spellingCheck(line, textDocument.uri, i).forEach((diagnostic) => {
				result.push(diagnostic);
			});
		}

		// validate CSV
		if (isCsv && (foundKeyword === null || foundKeyword.keyword !== ControlSequence.EndCsv)) {
			const columns = countCsvColumns(line);
			if (columns != csvColumns) {
				result.push(Shared.createDiagnostic(
					{
						uri: textDocument.uri,
						range: {
							start: { line: i, character: 0 },
							end: { line: i, character: line.length }
						}
					}, DiagnosticSeverity.Error, `Expected ${csvColumns} columns, but found ${columns}`
				));
			}
			continue;
		}

		// validate for variables
		if (isFor && (match = /@{.*}/.exec(line))) {
			const substr = match[0];
			let startPosition = match.index;
			const regexp = /[a-zA-Z_]\w*/g;
			while (match = regexp.exec(substr)) {
				const variable = match[0];
				if (!forVariables.find(name => name === variable) && !listNames.find(name => name === variable)) {
					startPosition += match.index;
					const endPosition = startPosition + variable.length;
					result.push(Shared.createDiagnostic(
						{
							uri: textDocument.uri,
							range: {
								start: { line: i, character: startPosition },
								end: { line: i, character: endPosition }
							}
						}, DiagnosticSeverity.Error, `${variable} is used in loop, but wasn't declared`
					));
				}
			}
		}

		while (foundKeyword !== null) { // `while` can handle several keywords per line

			// handle scripts
			if (foundKeyword.keyword === ControlSequence.EndScript) {
				const stackHead = nestedStack.pop();
				if (stackHead === undefined || stackHead.keyword !== ControlSequence.Script) {
					if (stackHead !== undefined) nestedStack.push(stackHead);
					result.push(Shared.createDiagnostic(
						{ uri: textDocument.uri, range: foundKeyword.range }, DiagnosticSeverity.Error,
						`${foundKeyword.keyword} has no matching ${ControlSequence.Script}`
					));
				}
				isScript = false;
				foundKeyword = ControlSequenceUtil.parseControlSequence(regex, line, i);
				if (foundKeyword === null) break;
				else continue;
			} else if (isScript) break;

			switch (foundKeyword.keyword) {
				case ControlSequence.EndCsv: {
					isCsv = false;
					const diagnostic = checkEnd(ControlSequence.Csv, nestedStack, foundKeyword, textDocument.uri);
					if (diagnostic !== null) result.push(diagnostic);
					break;
				}
				case ControlSequence.EndIf: {
					const diagnostic = checkEnd(ControlSequence.If, nestedStack, foundKeyword, textDocument.uri);
					if (diagnostic !== null) result.push(diagnostic);
					break;
				}
				case ControlSequence.EndFor: {

					isFor = false;
					forVariables.pop();
					const diagnostic = checkEnd(ControlSequence.For, nestedStack, foundKeyword, textDocument.uri);
					if (diagnostic !== null) result.push(diagnostic);
					break;
				}
				case ControlSequence.EndList: {
					const diagnostic = checkEnd(ControlSequence.List, nestedStack, foundKeyword, textDocument.uri);
					if (diagnostic !== null) result.push(diagnostic);
					break;
				}
				case ControlSequence.EndVar: {
					const diagnostic = checkEnd(ControlSequence.Var, nestedStack, foundKeyword, textDocument.uri);
					if (diagnostic !== null) result.push(diagnostic);
					break;
				}
				case ControlSequence.Else:
				case ControlSequence.ElseIf: {
					const stackHead = nestedStack.pop();
					const ifKeyword = nestedStack.find(value =>
						(value === undefined) ? false : value.keyword === ControlSequence.If
					);
					if (stackHead === undefined ||
						(stackHead.keyword !== ControlSequence.If && ifKeyword === undefined)) {
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
				case ControlSequence.Csv: {
					isCsv = true;
					let header: string;
					if (/=\s*$/m.test(line)) {
						header = lines[i + 1];
					} else {
						header = line.substring(/=/.exec(line).index + 1);
					}
					csvColumns = countCsvColumns(header);
					nestedStack.push(foundKeyword);
					break;
				}
				case ControlSequence.Var: {
					if (/=\s*(\[|\{)(|.*,)\s*$/m.test(line)) nestedStack.push(foundKeyword);
					break;
				}
				case ControlSequence.List: {
					const match = /^\s*list\s+(\w+)\s+=/.exec(line);
					if (match !== null) listNames.push(match[1]);
					if (/,[ \t]*$/m.test(line)) nestedStack.push(foundKeyword);
					break;
				}
				case ControlSequence.For: {
					nestedStack.push(foundKeyword);
					const match = /^\s*for\s+(\w+)\s+in/.exec(line);
					if (match !== null) {
						forVariables.push(match[1]);
						isFor = true;
					}
					break;
				}
				case ControlSequence.If: {
					nestedStack.push(foundKeyword);
					break;
				}
				case ControlSequence.Script: {
					nestedStack.push(foundKeyword);
					isScript = true;
					break;
				}
				default: throw new Error("Update switch-case statement!");
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
			case ControlSequence.Csv: {
				result.push(Shared.createDiagnostic(
					{ uri: uri, range: nestedConstruction.range }, DiagnosticSeverity.Error,
					`${nestedConstruction.keyword} has no matching ${ControlSequence.EndCsv}`
				));
				break;
			}
			case ControlSequence.Var: {
				result.push(Shared.createDiagnostic(
					{ uri: uri, range: nestedConstruction.range }, DiagnosticSeverity.Error,
					`${nestedConstruction.keyword} has no matching ${ControlSequence.EndVar}`
				));
				break;
			}
		}
	}

	return result;
}
