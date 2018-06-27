import * as Shared from './sharedFunctions';
import { TextEdit, TextDocument } from 'vscode-languageserver';

export function extraTextSectionLine(document: TextDocument): TextEdit[] {
	let edits: TextEdit[] = [];
	let text = Shared.deleteComments(document.getText());
	let target = /(?:(.*?[^ \t\n].*?)\[.*?\](.*))|(?:(.*?)\[.*\](.*?[^ \t\n].*))/g; // incorrect formatting
	let purpose = /\[.*\]/; // correct formatting
	let nonWhiteSpace = /\s*\S+\s*/;
	let matching: RegExpExecArray;

	while (matching = target.exec(text)) {
		let incorrectLine = matching[0];
		let substr = purpose.exec(incorrectLine)[0];
		let before = (matching[1] === undefined) ? matching[3] : matching[1];
		let after = (matching[2] === undefined) ? matching[4] : matching[2];
		let newText = (nonWhiteSpace.test(before)) ? before + '\n\n' + substr : substr;
		if (nonWhiteSpace.test(after)) newText += '\n\t' + after;
		let edit: TextEdit = {
			range: {
				start: document.positionAt(matching.index),
				end: document.positionAt(matching.index + incorrectLine.length)
			},
			newText: newText
		};
		edits.push(edit);
	}

	return edits;
}
