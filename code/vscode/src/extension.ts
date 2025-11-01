// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "programmersarepeopletoo" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('programmersarepeopletoo.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from ProgrammersArePeopleToo! Apple');
	});

	context.subscriptions.push(disposable);

	// Set up diagnostic monitoring for positive reinforcement
	setupDiagnosticMonitoring(context);

}

/**
 * Sets up diagnostic monitoring to track errors/warnings and celebrate improvements
 */
function setupDiagnosticMonitoring(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel('ProgrammersArePeopleToo');
	context.subscriptions.push(outputChannel);

	// Track diagnostic state per file to detect improvements
	const diagnosticState = new Map<string, number>();
	let lastNotificationTime = 0;

	const diagnosticSubscription = vscode.languages.onDidChangeDiagnostics(event => {
		// Process each URI that had diagnostic changes
		for (const uri of event.uris) {
			const diagnostics = vscode.languages.getDiagnostics(uri);
			const currentCount = diagnostics.length;
			const previousCount = diagnosticState.get(uri.toString()) || 0;

			// Log diagnostic details to console
			console.log(`📊 Diagnostics changed for ${uri.fsPath}:`);
			console.log(`   Previous: ${previousCount} issues, Current: ${currentCount} issues`);

			// Log individual diagnostics
			diagnostics.forEach((diag, index) => {
				const severityName = getSeverityName(diag.severity);
				console.log(`   ${index + 1}. [${severityName}] ${diag.message}`);
				console.log(`      Line ${diag.range.start.line + 1}, Column ${diag.range.start.character + 1}`);
				console.log(`      Source: ${diag.source || 'Unknown'}`);
			});

			// Update output channel
			outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ${uri.fsPath}: ${currentCount} issue(s)`);
			
			// Detect positive changes (fewer errors/warnings)
			if (previousCount > currentCount) {
				const improvement = previousCount - currentCount;
				console.log(`🎉 IMPROVEMENT DETECTED! ${improvement} issue(s) resolved!`);
				outputChannel.appendLine(`🎉 Improvement: ${improvement} issue(s) resolved!`);
				
				// Celebrate the improvement (throttled to avoid spam)
				const now = Date.now();
				if (now - lastNotificationTime > 2000) { // 2 second throttle
					vscode.window.showInformationMessage(
						`🎉 Great work! You fixed ${improvement} issue(s) in ${uri.fsPath.split('/').pop()}`
					);
					lastNotificationTime = now;
				}

				// TODO: Add visual celebrations (sparkles, animations, etc.)
				celebrateImprovement(improvement, uri);
			}

			// Special celebration for going from errors to zero
			if (previousCount > 0 && currentCount === 0) {
				console.log('✨ ALL CLEAR! No more issues in this file! ✨');
				outputChannel.appendLine('✨ ALL CLEAR! File is now error-free! ✨');
				
				// TODO: Add special "all clear" celebration (sparkles, confetti)
				celebrateAllClear(uri);
			}

			// Update state
			diagnosticState.set(uri.toString(), currentCount);
		}
	});

	context.subscriptions.push(diagnosticSubscription);
	
	// Log when monitoring starts
	console.log('🔍 Diagnostic monitoring activated - ready to celebrate your wins!');
	outputChannel.appendLine('🔍 Diagnostic monitoring activated - ready to celebrate your wins!');
}

/**
 * Convert VS Code diagnostic severity to readable name
 */
function getSeverityName(severity: vscode.DiagnosticSeverity): string {
	switch (severity) {
		case vscode.DiagnosticSeverity.Error: return 'ERROR';
		case vscode.DiagnosticSeverity.Warning: return 'WARNING';
		case vscode.DiagnosticSeverity.Information: return 'INFO';
		case vscode.DiagnosticSeverity.Hint: return 'HINT';
		default: return 'UNKNOWN';
	}
}

/**
 * Celebrate when issues are resolved
 */
function celebrateImprovement(issuesFixed: number, uri: vscode.Uri) {
	// TODO: Implement visual celebrations
	// - Green highlight animation
	// - Smooth pulse effect
	// - Sparkle particles
	console.log(`🌟 Celebrating ${issuesFixed} fixes in ${uri.fsPath}`);
}

/**
 * Special celebration for clearing all issues
 */
function celebrateAllClear(uri: vscode.Uri) {
	// TODO: Implement special "all clear" celebrations  
	// - Confetti animation
	// - Success sparkles
	// - Satisfying completion effects
	console.log(`✨ All clear celebration for ${uri.fsPath}!`);
}

// This method is called when your extension is deactivated
export function deactivate() { }
