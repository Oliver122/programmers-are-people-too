import * as vscode from 'vscode';
import { animateFix } from './animations';

const outputChannel = vscode.window.createOutputChannel('Programmers Are People Too');

function log(message: string) {
	console.log(message);
	outputChannel.appendLine(message);
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "programmersarepeopletoo" is now active!');

	const cheerMeUpDisposable = vscode.commands.registerCommand('programmersarepeopletoo.cheermeup', () => {
		const encouragingMessages = [
			"🎉 You're doing amazing work! Keep coding!",
			"✨ Every bug you fix makes you stronger!",
			"🚀 Your code is making a difference!",
			"💪 You've got this! One line at a time!",
			"🌟 Great developers are made through persistence!",
			"🔥 You're crushing those challenges!",
			"💎 Your dedication to coding is inspiring!",
			"🎯 Focus and determination - you have both!",
			"🌈 Every error is just a step closer to success!",
			"⚡ Your problem-solving skills are fantastic!"
		];

		const randomMessage = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
		
		log(`🤗 Cheer Me Up command executed - spreading positivity!`);
		vscode.window.showInformationMessage(randomMessage);
	});
	context.subscriptions.push(cheerMeUpDisposable);
	context.subscriptions.push(outputChannel);
	setupDiagnosticMonitoring(context);
	setupTaskMonitoring(context);
	setupSaveMonitoring(context);
	setupFileCreationMonitoring(context);
	setupFileRenameMonitoring(context);

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
		log(`✨ Fixed ${fixedRanges.length} issues in ${fileName}`);
		animateFix(context, uri, fixedRanges);
	});
	context.subscriptions.push(subscription);
}

function setupTaskMonitoring(context: vscode.ExtensionContext) {
	const subscription = vscode.tasks.onDidEndTaskProcess((event) => {
		const taskName = event.execution.task.name;
		const exitCode = event.exitCode;
		
		if (exitCode === 0) {
			log(`✅ Task "${taskName}" succeeded`);
			// TODO: Add celebration animation
		} else {
			log(`❌ Task "${taskName}" failed with code ${exitCode}`);
		}
	});
	context.subscriptions.push(subscription);
}

function setupSaveMonitoring(context: vscode.ExtensionContext) {
	const subscription = vscode.workspace.onDidSaveTextDocument((document) => {
		const fileName = document.uri.fsPath.split(/[/\\]/).pop() || document.uri.fsPath;
		log(`💾 Saved ${fileName}`);
		// TODO: Add save animation
	});
	context.subscriptions.push(subscription);
}

function setupFileCreationMonitoring(context: vscode.ExtensionContext) {
	const subscription = vscode.workspace.onDidCreateFiles((event) => {
		for (const uri of event.files) {
			const fileName = uri.fsPath.split(/[/\\]/).pop() || uri.fsPath;
			log(`✨ Created ${fileName}`);
			// TODO: Add creation animation
		}
	});
	context.subscriptions.push(subscription);
}

function setupFileRenameMonitoring(context: vscode.ExtensionContext) {
	const subscription = vscode.workspace.onDidRenameFiles((event) => {
		for (const { oldUri, newUri } of event.files) {
			const oldName = oldUri.fsPath.split(/[/\\]/).pop() || oldUri.fsPath;
			const newName = newUri.fsPath.split(/[/\\]/).pop() || newUri.fsPath;
			log(`🔄 Renamed ${oldName} → ${newName}`);
			// TODO: Add rename animation
		}
	});
	context.subscriptions.push(subscription);
}

export function deactivate() { }
