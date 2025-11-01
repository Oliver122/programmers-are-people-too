import * as vscode from 'vscode';

export function animateFix(
	context: vscode.ExtensionContext,
	uri: vscode.Uri,
	ranges: vscode.Range[],
	durationMs = 800
) {
	const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === uri.toString());
	if (!editor || ranges.length === 0) {
		return;
	}

	// Extend ranges to cover the complete word
	const extendedRanges = ranges.map(r => {
		const wordRange = editor.document.getWordRangeAtPosition(r.start);
		return wordRange || r;
	});

	// Smooth gradient sweep animation
	const frames = 30;
	const frameDelay = Math.floor(durationMs / frames);

	for (let i = 0; i < frames; i++) {
		setTimeout(() => {
			const progress = i / frames;
			
			// Smooth ease-in-out curve
			const eased = progress < 0.5
				? 4 * progress * progress * progress
				: 1 - Math.pow(-2 * progress + 2, 3) / 2;
			
			// Use eased progress for smooth opacity transition
			const opacity = eased < 0.5 
				? eased * 0.4  // Fade in to max 0.2
				: (1 - eased) * 0.4; // Fade out symmetrically

			const deco = vscode.window.createTextEditorDecorationType({
				backgroundColor: `rgba(100, 220, 140, ${opacity})`,
				border: `1px solid rgba(80, 200, 120, ${opacity * 0.5})`,
			});

			context.subscriptions.push(deco);
			editor.setDecorations(deco, extendedRanges);

			setTimeout(() => editor.setDecorations(deco, []), frameDelay + 20);
		}, i * frameDelay);
	}
}
