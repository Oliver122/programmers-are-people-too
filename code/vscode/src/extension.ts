import * as vscode from 'vscode';

const outputChannel = vscode.window.createOutputChannel('Programmers Are People Too');

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "programmersarepeopletoo" is now active!');
	const disposable = vscode.commands.registerCommand('programmersarepeopletoo.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from ProgrammersArePeopleToo! Apple');
	});
	context.subscriptions.push(disposable);
	context.subscriptions.push(outputChannel);
	setupDiagnosticMonitoring(context);
}

type DiagKey = string; // unique per diagnostic instance
const keyOf = (d: vscode.Diagnostic) =>
	`${d.severity}:${d.message}:${d.range.start.line}:${d.range.start.character}:${d.range.end.line}:${d.range.end.character}`;
type FixedRangesCallback = (uri: vscode.Uri, fixedRanges: vscode.Range[], fixedDiagnostics: vscode.Diagnostic[]) => void;

function subscribeToEvents(onFixedRanges?: FixedRangesCallback): vscode.Disposable {
	const lastByFile = new Map<string, Map<DiagKey, vscode.Diagnostic>>();

	const diagSub = vscode.languages.onDidChangeDiagnostics((event) => {
		for (const uri of event.uris) {
			const fileKey = uri.toString();
			const currArr = vscode.languages.getDiagnostics(uri);

			const currMap = new Map<DiagKey, vscode.Diagnostic>();
			for (const d of currArr) { currMap.set(keyOf(d), d); }
			const prevMap = lastByFile.get(fileKey) ?? new Map<DiagKey, vscode.Diagnostic>();

			const fixedRanges: vscode.Range[] = [];
			const fixedDiagnostics: vscode.Diagnostic[] = [];
			for (const [k, dPrev] of prevMap) {
				if (!currMap.has(k)) {
					// Check if there's still a diagnostic at the same location
					const stillHasIssueAtLocation = currArr.some(d => 
						d.range.start.line === dPrev.range.start.line &&
						d.range.start.character === dPrev.range.start.character
					);
					
					// Only celebrate if the diagnostic is truly gone, not just changed
					if (!stillHasIssueAtLocation) {
						fixedRanges.push(dPrev.range);
						fixedDiagnostics.push(dPrev);
					}
				}
			}

			if (fixedRanges.length) {
				if (onFixedRanges) {
					onFixedRanges(uri, fixedRanges, fixedDiagnostics);
				}
			}

			lastByFile.set(fileKey, currMap);
		}
	});
	return diagSub;
}

function animate(context: vscode.ExtensionContext, uri: vscode.Uri, ranges: vscode.Range[], durationMs = 900) {
	const celebrateDeco = vscode.window.createTextEditorDecorationType({
		textDecoration: 'underline wavy green',
		overviewRulerColor: 'green',
		overviewRulerLane: vscode.OverviewRulerLane.Right,
	});
	context.subscriptions.push(celebrateDeco);

	const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === uri.toString());
    if (!editor || ranges.length === 0) {
		return;
	}
	
	// Extend ranges to cover the complete word
	const extendedRanges = ranges.map(r => {
		const wordRange = editor.document.getWordRangeAtPosition(r.start);
		return wordRange || r;
	});
	
    editor.setDecorations(celebrateDeco, extendedRanges);
    setTimeout(() => editor.setDecorations(celebrateDeco, []), durationMs);
}

function setupDiagnosticMonitoring(context: vscode.ExtensionContext) {
	const subscription = subscribeToEvents((uri, fixedRanges, fixedDiagnostics) => {
		const fileName = uri.fsPath.split(/[/\\]/).pop() || uri.fsPath;
		console.log(`✨ Fixed ${fixedRanges.length} issues in ${fileName}`);
		outputChannel.appendLine(`✨ Fixed ${fixedRanges.length} issues in ${fileName}`);
		animate(context, uri, fixedRanges);
	});
	context.subscriptions.push(subscription);
}

export function deactivate() { }
