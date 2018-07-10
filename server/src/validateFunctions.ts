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
	const forPattern = /\bfor\s+[a-zA-Z_]\w*\s+in\b|\bendfor\b|@{.*?[a-zA-Z_]\w*.*}/g;
	const forDeclaration = /\bfor\s+([a-zA-Z_]\w*)\s+in\b/;
	const variablePattern = /\b([a-zA-Z_]\w*)\b/g;
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

const possibleOptions: string[] = [
	"addmeta","aheadtimespan","alertexpression","alertstyle","alias","align","attribute","audioalert","audioonload","autoeperiod","autoperiod",
	"autoscale","axis","axistitle","axistitleright","barcount","batchsize","batchupdate","borderwidth","bundle","buttons","cache","caption",
	"captionstyle","centralizecolumns","centralizeticks","changefield","circle","class","color","colorrange","colors","column","columncategory",
	"columndescription","columndisplaytype","columnentity","columnlabelformat","columnmessage","columnmetric","columnmoderationstatus","columnname",
	"columnnewbackend","columnoid","columnpublicationappendenabled","columnpublicationdate","columnpublicationgroup","columnpublicationstage",
	"columnrowsupdatedby","columnrule","columnseverity","columnsource","columntableid","columntags","columntime","columntype","columnvalue",
	"columnviewtype","context","contextpath","counter","counterposition","datatype","dayformat","dialogmaximize","disconnectcount","disconnectinterval",
	"disconnectvalue","display","displayinlegend","displaypanels","displayticks","displaytip","enabled","endtime","entities","entity","entityexpression",
	"entitygroup","errorrefreshinterval","exactmatch","expandpanels","expandtags","fillvalue","forecastname","format","formataxis","formatcounter",
	"formatnumbers","formattip","gradientcount","gradientintensity","groupfirst","groupinterpolate","groupinterpolateextend","groupkeys","groupperiod",
	"groupstatistic","half","headerstyle","heightunits","hidecolumn","horizontal","horizontalgrid","id","interpolate","interpolateboundary","interpolateextend",
	"interpolatefill","interpolatefunction","interpolateperiod","join","key","keys","label","labelformat","last","lastmarker","leftunits","legendposition",
	"legendvalue","limit","linkanimate","linkcolorrange","linkcolors","linkdata","links","linkthresholds","linkwidths","margin","markers","maxrange","maxrangeforce",
	"maxrangeright","maxrangerightforce","maxthreshold","maxvalue","mergecolumns","mergefields","methodpath","metric","metriclabel","minorticks","minrange","minrangeforce",
	"minrangeright","minrangerightforce","minvalue","mode","movingaverage","multipleseries","name","nodecolors","nodeconnect","nodelabels","noderadius","nodes",
	"nodethresholds","offsetbottom","offsetleft","offsetright","offsettop","onchange","onclick","onseriesclick","option","options","other","padding","parent","path",
	"percentilemarkers","percentiles","period","periods","pointerposition","properties","property","rate","ratecounter","refreshinterval","reload","replacevalue","responsive",
	"retryrefreshinterval","rightaxis","rotateticks","rowdisplay","rowstyle","scale","scalex","scaley","script","selectormode","serieslabels","serieslimit","seriestype",
	"seriesvalue","serveraggregate","severitystyle","singleentity","size","sort","source","stack","starttime","statistic","statistics","stepline","style","summarizeperiod",
	"table","tagexpression","tagsdropdowns","tagsdropdownsstyle","text","thresholds","ticks","ticksright","tickstime","timeoffset","timespan","timezone","title","tooltip",
	"topaxis","topunits","totalvalue","transpose","type","updateinterval","url","urlparameters","value","verticalgrid","widgetsperrow","widthunits"
];

const possibleSections: string[] = [
	"column", "configuration", "dropdown", "group", "keys", "link",
	"node", "option", "other", "properties", "property", "series",
	"tag", "tags", "threshold", "widget"
];

function isAbsent(word: string, dictionary: string[]): boolean {
	return dictionary.find((value: string) => {
		return (value === undefined) ? false : value === word;
	}) === undefined;
}

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
		if (isAbsent(withoutDash, dictionary)) {
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
	EndList = "endlist"
}

class FoundKeyword {
	keyword: ControlSequence;
	range: Range;
}

class ControlSequenceUtil {
	public static createRegex(): RegExp {
		return /\b(endcsv|endfor|elseif|endif|endscript|endlist|script|else|if|list|for|csv)\b/g;
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
			default: throw "Update control stackHead switch-case!";
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
	const unfinishedIndex = nestedStack.findIndex((value) => {
		return (value === undefined) ? false : value.keyword === expectedEnd;
	});
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
	let isCsv = false; // to perform format check
	let csvColumns = 0;
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

		if (isCsv && (foundKeyword === null || foundKeyword.keyword !== ControlSequence.EndCsv)) {
			const columns = countCsvColumns(line);
			if (columns != csvColumns) {
				result.push(Shared.createDiagnostic(
					{ uri: textDocument.uri, range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } } },
					DiagnosticSeverity.Error, `Expected ${csvColumns} columns, but found ${columns}`
				));
			}
			continue;
		}

		while (foundKeyword !== null) {
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
					const diagnostic = checkEnd(ControlSequence.For, nestedStack, foundKeyword, textDocument.uri);
					if (diagnostic !== null) result.push(diagnostic);
					break;
				}
				case ControlSequence.EndList: {
					const diagnostic = checkEnd(ControlSequence.List, nestedStack, foundKeyword, textDocument.uri);
					if (diagnostic !== null) result.push(diagnostic);
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
				case ControlSequence.Csv: {
					if (isScript) continue;
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
				case ControlSequence.List: if (!/,[ \t]*$/m.test(line)) break;
				case ControlSequence.For:
				case ControlSequence.If: {
					if (isScript) continue;
					nestedStack.push(foundKeyword);
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
			case ControlSequence.Csv: {
				result.push(Shared.createDiagnostic(
					{ uri: uri, range: nestedConstruction.range }, DiagnosticSeverity.Error,
					`${nestedConstruction.keyword} has no matching ${ControlSequence.EndCsv}`
				));
				break;
			}
		}
	}

	return result;
}
