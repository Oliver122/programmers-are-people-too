import * as vscode from 'vscode';
import { animateFix } from './animations';
import { StatisticsTracker } from './statistics';
import { getMotivationalHtml } from './motivationalPanel';

const outputChannel = vscode.window.createOutputChannel('Programmers Are People Too');
let statsTracker: StatisticsTracker;

function log(message: string) {
	console.log(message);
	outputChannel.appendLine(message);
}

function showMotivationalPanel(context: vscode.ExtensionContext, data: import('./statistics').MotivationalData) {
	// Create and show a new webview panel
	const panel = vscode.window.createWebviewPanel(
		'motivationalMessage',
		'🎉 Your Achievements',
		vscode.ViewColumn.One,
		{
			enableScripts: true,
			retainContextWhenHidden: true
		}
	);

	// Set the webview's HTML content
	panel.webview.html = getMotivationalHtml(data);
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "programmersarepeopletoo" is now active!');

	// Initialize statistics tracker
	statsTracker = new StatisticsTracker(context);
	log('📊 Statistics tracker initialized');

	const cheerMeUpDisposable = vscode.commands.registerCommand('programmersarepeopletoo.cheermeup', async () => {
		log(`🤗 Cheer Me Up command executed - spreading positivity!`);
		
		// Debug: Show summary of all tracked events
		const summary = statsTracker.getSummary();
		console.log('[CheerMeUp] Statistics summary:', JSON.stringify(summary, null, 2));
		
		// Get configured duration from settings (in minutes, convert to milliseconds)
		const config = vscode.workspace.getConfiguration('ProgrammersArePeopleToo');
		const durationMinutes = config.get<number>('cheerMeUpDurationMinutes', 60);
		const durationMs = durationMinutes * 60 * 1000;
		
		console.log(`[CheerMeUp] Using duration: ${durationMinutes} minutes (${durationMs}ms)`);
		
		// Generate motivational data based on statistics
		const motivationalData = statsTracker.generateMotivationalData(durationMs);
		
		// Show summary in output channel
		outputChannel.appendLine('\n' + '='.repeat(60));
		outputChannel.appendLine(motivationalData.intro);
		outputChannel.appendLine('');
		if (motivationalData.achievements.diagnostics.total > 0) {
			outputChannel.appendLine(`✨ Fixed ${motivationalData.achievements.diagnostics.total} diagnostic issues`);
		}
		if (motivationalData.achievements.tasks.total > 0) {
			outputChannel.appendLine(`✅ Completed ${motivationalData.achievements.tasks.total} tasks`);
		}
		if (motivationalData.achievements.files.total > 0) {
			outputChannel.appendLine(`📝 ${motivationalData.achievements.files.total} file operations`);
		}
		outputChannel.appendLine('');
		outputChannel.appendLine(motivationalData.outro);
		outputChannel.appendLine('='.repeat(60) + '\n');
		
		// Create and show webview panel
		showMotivationalPanel(context, motivationalData);
	});
	context.subscriptions.push(cheerMeUpDisposable);
	
	// Debug command to show all statistics
	const showStatsDisposable = vscode.commands.registerCommand('programmersarepeopletoo.showstats', () => {
		const summary = statsTracker.getSummary();
		const allEvents = statsTracker.getAllEvents();
		
		outputChannel.appendLine('\n' + '='.repeat(60));
		outputChannel.appendLine('📊 STATISTICS DEBUG');
		outputChannel.appendLine('='.repeat(60));
		outputChannel.appendLine(`Total events tracked: ${allEvents.length}`);
		outputChannel.appendLine(`Session start: ${new Date(summary.sessionStartTime).toISOString()}`);
		outputChannel.appendLine('\nEvents by type:');
		for (const [type, stats] of Object.entries(summary.byType)) {
			outputChannel.appendLine(`  ${type}: ${stats.total} total (${stats.resolved} resolved, ${stats.unresolved} unresolved)`);
		}
		outputChannel.appendLine('\nAll events:');
		for (const event of allEvents.slice(0, 20)) { // Show first 20
			outputChannel.appendLine(`  [${event.type}/${event.subtype}] ${event.description}`);
			outputChannel.appendLine(`    Created: ${new Date(event.timestamp).toISOString()}`);
			if (event.resolvedTimestamp) {
				outputChannel.appendLine(`    Resolved: ${new Date(event.resolvedTimestamp).toISOString()}`);
			}
		}
		if (allEvents.length > 20) {
			outputChannel.appendLine(`  ... and ${allEvents.length - 20} more`);
		}
		outputChannel.appendLine('='.repeat(60) + '\n');
		outputChannel.show();
	});
	context.subscriptions.push(showStatsDisposable);
	
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

function subscribeToEvents(onFixedRanges?: FixedRangesCallback, onNewDiagnostics?: (uri: vscode.Uri, newDiagnostics: vscode.Diagnostic[]) => void): vscode.Disposable {
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
			const newDiagnostics: vscode.Diagnostic[] = [];
			
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

			// Find new diagnostics
			for (const [k, dCurr] of currMap) {
				if (!prevMap.has(k)) {
					newDiagnostics.push(dCurr);
				}
			}

			if (fixedRanges.length) {
				if (onFixedRanges) {
					onFixedRanges(uri, fixedRanges, fixedDiagnostics);
				}
			}

			if (newDiagnostics.length && onNewDiagnostics) {
				onNewDiagnostics(uri, newDiagnostics);
			}

			lastByFile.set(fileKey, currMap);
		}
	});
	return diagSub;
}

function setupDiagnosticMonitoring(context: vscode.ExtensionContext) {
	const subscription = subscribeToEvents(
		(uri, fixedRanges, fixedDiagnostics) => {
			const fileName = uri.fsPath.split(/[/\\]/).pop() || uri.fsPath;
			log(`✨ Fixed ${fixedRanges.length} issues in ${fileName}`);
			
			// Track resolved diagnostics
			for (const diagnostic of fixedDiagnostics) {
				statsTracker.trackDiagnostic(diagnostic, uri, 'resolved');
			}
			
			animateFix(context, uri, fixedRanges);
		},
		(uri, newDiagnostics) => {
			// Track new diagnostics
			for (const diagnostic of newDiagnostics) {
				statsTracker.trackDiagnostic(diagnostic, uri, 'added');
			}
		}
	);
	context.subscriptions.push(subscription);
}

function setupTaskMonitoring(context: vscode.ExtensionContext) {
	const subscription = vscode.tasks.onDidEndTaskProcess((event) => {
		const taskName = event.execution.task.name;
		const exitCode = event.exitCode ?? -1;
		
		// Track task execution
		statsTracker.trackTask(taskName, exitCode);
		
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
		
		// Track file change
		statsTracker.trackFileChanged(document.uri);
		// TODO: Add save animation
	});
	context.subscriptions.push(subscription);
}

function setupFileCreationMonitoring(context: vscode.ExtensionContext) {
	const subscription = vscode.workspace.onDidCreateFiles((event) => {
		for (const uri of event.files) {
			const fileName = uri.fsPath.split(/[/\\]/).pop() || uri.fsPath;
			log(`✨ Created ${fileName}`);
			
			// Track file creation
			statsTracker.trackFileCreated(uri);
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
			
			// Track file rename
			statsTracker.trackFileRenamed(oldUri, newUri);
			// TODO: Add rename animation
		}
	});
	context.subscriptions.push(subscription);
}

export function deactivate() { }
