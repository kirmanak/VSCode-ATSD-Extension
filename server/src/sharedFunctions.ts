import { Location, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';

const diagnosticSource = "Axibase Visual Plugin";

export function createDiagnostic(location: Location, severity: DiagnosticSeverity, message: string): Diagnostic {
	const diagnostic: Diagnostic = {
		severity: severity, range: location.range, 
		message: message, source: diagnosticSource,
	};
	return diagnostic;
}

export function deleteComments(text: string): string {
	const multiLine = /\/\*[\s\S]*?\*\//gm;
	const oneLine = /#.*/g;
	const notSpace = /\S/g;
	let i, j: RegExpExecArray;

	while ((i = multiLine.exec(text)) || (i = oneLine.exec(text))) {
		let comment = i[0];
		while (j = notSpace.exec(comment)) {
			comment = comment.substring(0, j.index) + " " + comment.substring(j.index + 1);
		}
		text = text.substring(0, i.index) + comment +
			text.substring(i.index + comment.length);

	}

	return text;
}

export function deleteInlineJS(text: string): string {
	const toReplaceRegex = /script([\s\S]*)endscript|(?:replace-)?value[ \t]=[ \t]([\s\S]*)$/gm;
	let matching: RegExpExecArray;

	while (matching = toReplaceRegex.exec(text)) {
		if (matching[1]) {
			let spaces = "";
			for (let i = 0; i < matching[1].length; i++) {
				spaces += " ";
			}
			text.substring(0, matching.index) + spaces + text.substring(matching.index + matching[0].length);
		} else {
			let spaces = "";
			for (let i = 0; i < matching[2].length; i++) {
				spaces += " ";
			}
			text.substring(0, matching.index) + spaces + text.substring(matching.index + matching[0].length);
		}
	}

	return text
}
