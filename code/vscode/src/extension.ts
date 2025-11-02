import * as vscode from 'vscode';
import { animateFix } from './animations';

const outputChannel = vscode.window.createOutputChannel('Programmers Are People Too');

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "programmersarepeopletoo" is now active!');
	const disposable = vscode.commands.registerCommand('programmersarepeopletoo.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from ProgrammersArePeopleToo! Apple');
	});
	context.subscriptions.push(disposable);
	context.subscriptions.push(outputChannel);
	setupDiagnosticMonitoring(context);

	//Example to extract config values
	/* vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("ProgrammersArePeopleToo.enable")) {
      const config = vscode.workspace.getConfiguration(
        "ProgrammersArePeopleToo"
      );
      const isEnabled = config.get<boolean>("enable");

      if (isEnabled) {
        console.log("Extension activated: Programmers are people too!");
      } else {
        console.log("Extension deactivated: Programmers are people too!");
      }
    }
  }); */
  //animation(context);
  test(context);
}

function test(context: vscode.ExtensionContext){
 let panel: vscode.WebviewPanel | undefined;

    vscode.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        // Erstelle das Webview-Panel, falls es noch nicht existiert
        if (!panel) {
            panel = vscode.window.createWebviewPanel(
                'powerMode',
                'Power Mode',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.file(context.extensionPath)]
                }
            );

            // HTML-Inhalt für das Webview-Panel
            panel.webview.html = getWebviewContent(context);
        }

        // Sende die Cursorposition an das Webview
        const position = editor.selection.active;
        const cursorPosition = editor.document.offsetAt(position);
        const line = editor.document.lineAt(position.line);
        const charPosition = position.character;

        // Berechne die Pixelposition des Cursors
        const cursorPixelPosition = editor.document.lineAt(position.line).range.end;

        panel.webview.postMessage({
            command: 'animate',
            line: position.line,
            charPosition: position.character
        });
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.stopPowerMode', () => {
            if (panel) {
                panel.dispose();
                panel = undefined;
            }
        })
    );
}

function getWebviewContent(context: vscode.ExtensionContext): string {
    const gifPath = vscode.Uri.file(context.asAbsolutePath('media/sparkle.gif')).with({ scheme: 'vscode-resource' });

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <style>
                body {
                    margin: 0;
                    overflow: hidden;
                }
                canvas {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                }
            </style>
        </head>`;
	}

function animation(context: vscode.ExtensionContext){
	
	const editor = vscode.window.activeTextEditor;
  	if (!editor) return;

	if(editor){
		const position = editor.selection.active;
		const line = editor.document.lineAt(position.line);
		const range = new vscode.Range(line.range.end, line.range.end);

		const decorationType = vscode.window.createTextEditorDecorationType({
		  after: {
			contentIconPath: vscode.Uri.file(
				context.asAbsolutePath('media/sparkle.gif')),
				width: '1em',
				height: '1em',
				margin : '0 0 0 5px',
		  }
		});
	
		//const position = new vscode.Position(lineNumber,charIndex);
		//const position = editor.selection.active;
		//const range = new vscode.Range(endPosition, endPosition);
		editor.setDecorations(decorationType, [ range ]);
	
		// Optional: nach kurzer Zeit wieder entfernen
		setTimeout(() => {
		  editor.setDecorations(decorationType, []);
		}, 15000);
	  

	}

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

function setupDiagnosticMonitoring(context: vscode.ExtensionContext) {
	const subscription = subscribeToEvents((uri, fixedRanges, fixedDiagnostics) => {
		const fileName = uri.fsPath.split(/[/\\]/).pop() || uri.fsPath;
		console.log(`✨ Fixed ${fixedRanges.length} issues in ${fileName}`);
		outputChannel.appendLine(`✨ Fixed ${fixedRanges.length} issues in ${fileName}`);
		animateFix(context, uri, fixedRanges);
	});
	context.subscriptions.push(subscription);
}

export function deactivate() { }
