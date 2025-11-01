import * as vscode from 'vscode';

/**
 * Generic event tracking entry
 */
export interface EventEntry {
	/** Unique identifier for this event instance */
	id: string;
	/** Type of event (diagnostic, task, file, etc.) */
	type: string;
	/** Subtype or category (e.g., "error", "warning", "info" for diagnostics) */
	subtype: string;
	/** Human-readable description */
	description: string;
	/** Timestamp when the event occurred */
	timestamp: number;
	/** Timestamp when the issue was resolved (if applicable) */
	resolvedTimestamp?: number;
	/** Number of times this same issue occurred */
	occurrenceCount: number;
	/** Additional metadata specific to the event type */
	metadata?: Record<string, any>;
}

/**
 * Statistics for a specific event type
 */
export interface EventTypeStats {
	/** Total number of events */
	total: number;
	/** Number of resolved events */
	resolved: number;
	/** Number of unresolved events */
	unresolved: number;
	/** Average time to resolution (in milliseconds) */
	averageResolutionTime?: number;
	/** Most common subtypes */
	subtypeCounts: Record<string, number>;
}

/**
 * Overall statistics summary
 */
export interface StatisticsSummary {
	/** Statistics per event type */
	byType: Record<string, EventTypeStats>;
	/** Total events across all types */
	totalEvents: number;
	/** Session start time */
	sessionStartTime: number;
	/** Last update time */
	lastUpdateTime: number;
}

/**
 * Achievement level for motivational messages
 */
export type AchievementLevel = 'minimal' | 'low' | 'medium' | 'high' | 'epic';

/**
 * Structured motivational data for rendering
 */
export interface MotivationalData {
	/** Achievement level determining message tone */
	level: AchievementLevel;
	/** Intro message */
	intro: string;
	/** Outro message */
	outro: string;
	/** Human-readable time description */
	timeDescription: string;
	/** Detailed achievement statistics */
	achievements: {
		diagnostics: {
			total: number;
			errors: number;
			warnings: number;
			hints: number;
		};
		tasks: {
			successful: number;
			recovered: number;
			total: number;
		};
		files: {
			created: number;
			changed: number;
			renamed: number;
			total: number;
		};
	};
	/** Whether any achievements were recorded */
	hasAchievements: boolean;
}

/**
 * Global statistics tracker for the extension
 */
export class StatisticsTracker {
	private events: Map<string, EventEntry> = new Map();
	private sessionStartTime: number;
	private context: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
		this.sessionStartTime = Date.now();
		this.loadFromStorage();
	}

	/**
	 * Track a new event
	 */
	trackEvent(
		type: string,
		subtype: string,
		description: string,
		metadata?: Record<string, any>
	): string {
		const id = this.generateEventId(type, subtype, description);
		const existingEvent = this.events.get(id);

		if (existingEvent) {
			// Event already exists, increment occurrence count
			existingEvent.occurrenceCount++;
			existingEvent.timestamp = Date.now();
			existingEvent.metadata = { ...existingEvent.metadata, ...metadata };
			console.log(`[Stats] Updated event: ${type}/${subtype} - ${description.substring(0, 50)}`);
		} else {
			// New event
			const newEvent: EventEntry = {
				id,
				type,
				subtype,
				description,
				timestamp: Date.now(),
				occurrenceCount: 1,
				metadata: metadata || {}
			};
			this.events.set(id, newEvent);
			console.log(`[Stats] New event tracked: ${type}/${subtype} - ${description.substring(0, 50)}`);
		}

		this.saveToStorage();
		return id;
	}

	/**
	 * Mark an event as resolved
	 */
	resolveEvent(eventId: string): boolean {
		const event = this.events.get(eventId);
		if (event && !event.resolvedTimestamp) {
			event.resolvedTimestamp = Date.now();
			console.log(`[Stats] Resolved event: ${event.type}/${event.subtype} - ${event.description.substring(0, 50)}`);
			this.saveToStorage();
			return true;
		}
		return false;
	}

	/**
	 * Track a diagnostic issue
	 */
	trackDiagnostic(
		diagnostic: vscode.Diagnostic,
		uri: vscode.Uri,
		action: 'added' | 'resolved'
	): string {
		const severity = this.getDiagnosticSeverityName(diagnostic.severity);
		const description = `${severity} in ${this.getFileName(uri)}: ${diagnostic.message}`;
		const metadata = {
			uri: uri.toString(),
			severity: diagnostic.severity,
			source: diagnostic.source,
			line: diagnostic.range.start.line,
			character: diagnostic.range.start.character
		};

		const id = this.trackEvent('diagnostic', severity, description, metadata);

		if (action === 'resolved') {
			this.resolveEvent(id);
		}

		return id;
	}

	/**
	 * Track a task execution
	 */
	trackTask(
		taskName: string,
		exitCode: number,
		metadata?: Record<string, any>
	): string {
		const status = exitCode === 0 ? 'success' : 'failure';
		const description = `Task "${taskName}" ${status}`;
		const id = this.trackEvent('task', status, description, {
			taskName,
			exitCode,
			...metadata
		});

		if (status === 'success') {
			// Check if there's a previous failure to resolve
			const failureId = this.findUnresolvedTask(taskName);
			if (failureId) {
				this.resolveEvent(failureId);
			}
		}

		return id;
	}

	/**
	 * Track file creation
	 */
	trackFileCreated(uri: vscode.Uri): string {
		const fileName = this.getFileName(uri);
		return this.trackEvent('file', 'created', `Created ${fileName}`, {
			uri: uri.toString(),
			fileName
		});
	}

	/**
	 * Track file changes (saves)
	 */
	trackFileChanged(uri: vscode.Uri): string {
		const fileName = this.getFileName(uri);
		return this.trackEvent('file', 'changed', `Changed ${fileName}`, {
			uri: uri.toString(),
			fileName
		});
	}

	/**
	 * Track file rename
	 */
	trackFileRenamed(oldUri: vscode.Uri, newUri: vscode.Uri): string {
		const oldName = this.getFileName(oldUri);
		const newName = this.getFileName(newUri);
		return this.trackEvent('file', 'renamed', `Renamed ${oldName} to ${newName}`, {
			oldUri: oldUri.toString(),
			newUri: newUri.toString(),
			oldName,
			newName
		});
	}

	/**
	 * Get statistics summary
	 */
	getSummary(): StatisticsSummary {
		const byType: Record<string, EventTypeStats> = {};
		let totalEvents = 0;

		for (const event of this.events.values()) {
			if (!byType[event.type]) {
				byType[event.type] = {
					total: 0,
					resolved: 0,
					unresolved: 0,
					subtypeCounts: {}
				};
			}

			const typeStats = byType[event.type];
			typeStats.total++;
			totalEvents++;

			if (event.resolvedTimestamp) {
				typeStats.resolved++;
			} else {
				typeStats.unresolved++;
			}

			typeStats.subtypeCounts[event.subtype] = 
				(typeStats.subtypeCounts[event.subtype] || 0) + 1;
		}

		// Calculate average resolution times
		for (const [type, stats] of Object.entries(byType)) {
			const resolvedEvents = Array.from(this.events.values()).filter(
				e => e.type === type && e.resolvedTimestamp
			);

			if (resolvedEvents.length > 0) {
				const totalResolutionTime = resolvedEvents.reduce(
					(sum, e) => sum + (e.resolvedTimestamp! - e.timestamp),
					0
				);
				stats.averageResolutionTime = totalResolutionTime / resolvedEvents.length;
			}
		}

		return {
			byType,
			totalEvents,
			sessionStartTime: this.sessionStartTime,
			lastUpdateTime: Date.now()
		};
	}

	/**
	 * Get all events of a specific type
	 */
	getEventsByType(type: string): EventEntry[] {
		return Array.from(this.events.values()).filter(e => e.type === type);
	}

	/**
	 * Get unresolved events
	 */
	getUnresolvedEvents(): EventEntry[] {
		return Array.from(this.events.values()).filter(e => !e.resolvedTimestamp);
	}

	/**
	 * Get all events (for debugging)
	 */
	getAllEvents(): EventEntry[] {
		return Array.from(this.events.values());
	}

	/**
	 * Clear all statistics
	 */
	clear(): void {
		this.events.clear();
		this.sessionStartTime = Date.now();
		this.saveToStorage();
	}

	/**
	 * Export statistics as JSON
	 */
	export(): string {
		return JSON.stringify({
			events: Array.from(this.events.values()),
			summary: this.getSummary()
		}, null, 2);
	}

	/**
	 * Get events within a specific time duration
	 * @param durationMs Duration in milliseconds to look back
	 * @returns Events that occurred or were resolved within the duration
	 */
	getEventsInDuration(durationMs: number): EventEntry[] {
		const cutoffTime = Date.now() - durationMs;
		return Array.from(this.events.values()).filter(
			e => e.timestamp >= cutoffTime || (e.resolvedTimestamp && e.resolvedTimestamp >= cutoffTime)
		);
	}

	/**
	 * Generate a motivational message based on recent achievements
	 * @param durationMs Duration in milliseconds to look back (default: 1 hour)
	 * @returns Motivational data structure with all achievement details
	 */
	generateMotivationalData(durationMs: number = 60 * 60 * 1000): MotivationalData {
		const recentEvents = this.getEventsInDuration(durationMs);
		const cutoffTime = Date.now() - durationMs;

		// Debug logging
		console.log(`[Stats] Total events in storage: ${this.events.size}`);
		console.log(`[Stats] Recent events (last ${durationMs}ms): ${recentEvents.length}`);
		console.log(`[Stats] Cutoff time: ${new Date(cutoffTime).toISOString()}`);
		console.log(`[Stats] Current time: ${new Date().toISOString()}`);

		// Count achievements - only count events that occurred OR were resolved within the time period
		const fixedDiagnostics = recentEvents.filter(
			e => e.type === 'diagnostic' && e.resolvedTimestamp && e.resolvedTimestamp >= cutoffTime
		);
		const fixedErrors = fixedDiagnostics.filter(e => e.subtype === 'error').length;
		const fixedWarnings = fixedDiagnostics.filter(e => e.subtype === 'warning').length;
		const fixedHints = fixedDiagnostics.filter(e => e.subtype === 'hint').length;
		const totalFixedIssues = fixedDiagnostics.length;

		console.log(`[Stats] Fixed diagnostics: ${totalFixedIssues} (errors: ${fixedErrors}, warnings: ${fixedWarnings}, hints: ${fixedHints})`);

		// For successful tasks, we want tasks that completed (timestamp) within the period
		const successfulTasks = recentEvents.filter(
			e => e.type === 'task' && e.subtype === 'success' && e.timestamp >= cutoffTime
		);
		// For recovered tasks, we want failed tasks that were resolved within the period
		const recoveredTasks = recentEvents.filter(
			e => e.type === 'task' && e.subtype === 'failure' && e.resolvedTimestamp && e.resolvedTimestamp >= cutoffTime
		);

		console.log(`[Stats] Successful tasks: ${successfulTasks.length}, Recovered tasks: ${recoveredTasks.length}`);

		// For files, we want file events that occurred within the period
		const filesCreated = recentEvents.filter(
			e => e.type === 'file' && e.subtype === 'created' && e.timestamp >= cutoffTime
		).length;
		const filesChanged = recentEvents.filter(
			e => e.type === 'file' && e.subtype === 'changed' && e.timestamp >= cutoffTime
		).length;
		const filesRenamed = recentEvents.filter(
			e => e.type === 'file' && e.subtype === 'renamed' && e.timestamp >= cutoffTime
		).length;

		console.log(`[Stats] Files created: ${filesCreated}, Files changed: ${filesChanged}, Files renamed: ${filesRenamed}`);

		// Calculate achievement level
		const achievementCount = (totalFixedIssues > 0 ? 1 : 0) + 
			(successfulTasks.length + recoveredTasks.length > 0 ? 1 : 0) + 
			(filesCreated > 0 ? 1 : 0) + 
			(filesChanged > 0 ? 1 : 0);

		const level = this.getAchievementLevel(totalFixedIssues, achievementCount);
		const intro = this.getMotivationalIntro(totalFixedIssues, achievementCount);
		const outro = this.getMotivationalOutro(totalFixedIssues);

		return {
			level,
			intro,
			outro,
			timeDescription: this.getTimeDescription(durationMs),
			achievements: {
				diagnostics: {
					total: totalFixedIssues,
					errors: fixedErrors,
					warnings: fixedWarnings,
					hints: fixedHints
				},
				tasks: {
					successful: successfulTasks.length,
					recovered: recoveredTasks.length,
					total: successfulTasks.length + recoveredTasks.length
				},
				files: {
					created: filesCreated,
					changed: filesChanged,
					renamed: filesRenamed,
					total: filesCreated + filesChanged + filesRenamed
				}
			},
			hasAchievements: achievementCount > 0
		};
	}

	/**
	 * Get achievement level based on performance
	 */
	private getAchievementLevel(fixedIssues: number, achievementCount: number): AchievementLevel {
		if (fixedIssues >= 10) {
			return 'epic';
		} else if (fixedIssues >= 5) {
			return 'high';
		} else if (achievementCount >= 3) {
			return 'medium';
		} else if (achievementCount >= 1) {
			return 'low';
		}
		return 'minimal';
	}

	/**
	 * Get a motivational introduction based on achievements
	 */
	private getMotivationalIntro(fixedIssues: number, achievementCount: number): string {
		const messageBank = this.getIntroMessages();
		
		if (fixedIssues >= 10) {
			return this.randomFrom(messageBank.epic);
		} else if (fixedIssues >= 5) {
			return this.randomFrom(messageBank.high);
		} else if (achievementCount >= 3) {
			return this.randomFrom(messageBank.medium);
		} else if (achievementCount >= 1) {
			return this.randomFrom(messageBank.low);
		}
		return this.randomFrom(messageBank.minimal);
	}

	/**
	 * Get a motivational outro based on achievements
	 */
	private getMotivationalOutro(fixedIssues: number): string {
		const messageBank = this.getOutroMessages();
		
		if (fixedIssues >= 10) {
			return this.randomFrom(messageBank.epic);
		} else if (fixedIssues >= 5) {
			return this.randomFrom(messageBank.high);
		}
		return this.randomFrom(messageBank.general);
	}

	/**
	 * Intro message bank organized by achievement level
	 */
	private getIntroMessages() {
		return {
			epic: [
				"🎉 **Amazing work!** Look at what you've accomplished:",
				"🔥 **Incredible!** You're absolutely crushing it:",
				"⚡ **Phenomenal!** Your productivity is off the charts:",
				"💎 **Outstanding!** You're coding like a legend:",
				"🌟 **Spectacular!** Check out these achievements:",
				"🚀 **Wow!** You're on an absolute roll:",
				"👑 **Legendary!** Your skill is showing:",
				"✨ **Brilliant work!** Look at this progress:",
				"🎯 **Perfect execution!** You've been unstoppable:",
				"🏆 **Champion mode!** Here's what you've conquered:",
				"💪 **Powerhouse!** Your coding prowess is impressive:",
				"🌈 **Magnificent!** You're creating magic:",
				"⭐ **Superb!** Your dedication is inspiring:",
				"🎊 **Exceptional!** You're exceeding expectations:",
				"🔮 **Masterful!** Your expertise is evident:",
				"🎨 **Artistry!** You're crafting beautiful code:",
				"⚙️ **Engineering excellence!** Check this out:",
				"🌠 **Stellar performance!** You're shining bright:",
				"🎪 **Show-stopping!** Your achievements are remarkable:",
				"💫 **Extraordinary!** You're making waves:"
			],
			high: [
				"🚀 **You're on fire!** Check out your progress:",
				"⚡ **Blazing through!** Look at what you've done:",
				"💪 **Strong momentum!** Your achievements speak volumes:",
				"🌟 **Shining bright!** Here's your impressive work:",
				"🔥 **Hot streak!** You're making serious progress:",
				"✨ **Sparkling performance!** Check these wins:",
				"🎯 **Right on target!** Your focus is paying off:",
				"🏃 **Moving fast!** Look at this productivity:",
				"💡 **Brilliant pace!** You're solving problems left and right:",
				"🌊 **Riding the wave!** Your flow is incredible:",
				"⭐ **Star performer!** Here's what you've achieved:",
				"🎪 **Impressive show!** You're doing great:",
				"🌅 **Rising to the occasion!** Check out these wins:",
				"🔋 **Fully charged!** Your energy is contagious:",
				"🎵 **In the zone!** Your rhythm is perfect:",
				"🌺 **Flourishing!** Look at this beautiful progress:",
				"🎭 **Outstanding performance!** You're nailing it:",
				"🌻 **Growing strong!** Your skills are blooming:",
				"🎬 **Action-packed!** You're getting things done:",
				"🌙 **Moonshot worthy!** Your ambition shows:"
			],
			medium: [
				"💪 **Great progress!** Here's what you've achieved:",
				"👏 **Well done!** Your efforts are showing:",
				"🌟 **Looking good!** Check out your wins:",
				"✅ **Solid work!** You're making headway:",
				"🎯 **On track!** Here's your progress:",
				"🌱 **Growing steadily!** Look at these improvements:",
				"📈 **Trending up!** Your work is paying off:",
				"🎨 **Creating value!** Here's what you've built:",
				"🔧 **Building well!** Your progress is clear:",
				"🌿 **Cultivating quality!** Check these achievements:",
				"💡 **Smart moves!** You're solving problems:",
				"🎪 **Nice show!** Your skills are developing:",
				"🌤️ **Clearing the path!** Look at this progress:",
				"🔨 **Hammering through!** You're making it happen:",
				"🎵 **Finding your rhythm!** Here's your work:",
				"🌾 **Harvesting results!** Check out these wins:",
				"🎯 **Hitting marks!** Your aim is improving:",
				"🌸 **Blossoming skills!** Look at what you've done:",
				"🔑 **Unlocking potential!** Here's your progress:",
				"🎨 **Painting progress!** You're creating something good:"
			],
			low: [
				"🌟 **Nice work!** You're making progress:",
				"👍 **Good job!** Every step counts:",
				"✨ **Keep going!** You're building momentum:",
				"🌱 **Making moves!** Here's what you've done:",
				"💫 **Progress noted!** You're on the right path:",
				"🎯 **Steps forward!** Your effort matters:",
				"🌿 **Growing!** Check out your achievements:",
				"📍 **Moving ahead!** You're making it happen:",
				"🎈 **Rising up!** Your work is adding up:",
				"🌤️ **Looking bright!** Here's your progress:",
				"🔹 **Small wins!** They all count:",
				"🌊 **Flowing forward!** You're making waves:",
				"🎨 **Creating!** Every change is progress:",
				"🔮 **Developing!** You're building something:",
				"🌸 **Blooming!** Your skills are growing:",
				"🎪 **Performing!** You're getting things done:",
				"💡 **Learning!** Every fix teaches something:",
				"🌺 **Progressing!** You're moving in the right direction:",
				"🎭 **Improving!** Your code is getting better:",
				"🌻 **Advancing!** Here's what you've accomplished:"
			],
			minimal: [
				"👏 **Keep it up!** Here's your progress:",
				"🌱 **Every bit helps!** You're moving forward:",
				"💪 **Stay strong!** Progress is progress:",
				"✨ **You're doing it!** Here's what you've got:",
				"🎯 **On the path!** Every step matters:",
				"🌿 **Growing slowly!** That's still growth:",
				"📌 **Noted!** Your work counts:",
				"🔹 **Building up!** Small steps are still steps:",
				"🌤️ **Hang in there!** You're making progress:",
				"💡 **Keep learning!** You're improving:",
				"🎈 **Stay positive!** Progress is happening:",
				"🌸 **One step at a time!** You're moving:",
				"🎨 **Creating bit by bit!** Keep going:",
				"🔮 **Trust the process!** You're getting there:",
				"🌊 **Riding the tide!** Forward is forward:",
				"🎪 **Show up!** Consistency wins:",
				"💫 **Believe!** You're making it happen:",
				"🌺 **Persistence pays!** Keep at it:",
				"🎵 **Find your groove!** It's coming:",
				"🌻 **Day by day!** You're progressing:"
			]
		};
	}

	/**
	 * Outro message bank organized by achievement level
	 */
	private getOutroMessages() {
		return {
			epic: [
				"Your dedication is incredible! You're crushing it! 🎯",
				"You're a coding powerhouse! Absolutely phenomenal! 💎",
				"This level of productivity is inspiring! Keep dominating! 🏆",
				"You're not just fixing bugs, you're crafting excellence! ✨",
				"Your persistence is legendary! You're unstoppable! 🚀",
				"Code quality champion! You're setting the bar high! 👑",
				"Absolute mastery on display! You're a true professional! ⚡",
				"You're turning complexity into clarity! Brilliant work! 🌟",
				"Your problem-solving skills are next level! Phenomenal! 💪",
				"You're not just writing code, you're creating art! 🎨",
				"This is what excellence looks like! You're amazing! 🔥",
				"You're proving that great developers are made, not born! 🌈",
				"Your code is getting stronger with every fix! Outstanding! 💫",
				"You're building something remarkable! Keep this energy! ⭐",
				"Your technical prowess is shining through! Spectacular! 🎊",
				"You're turning challenges into triumphs! Incredible! 🎪",
				"This is peak performance! You're in the zone! 🔮",
				"Your expertise is evident in every line! Magnificent! 🌠",
				"You're not just solving problems, you're preventing them! 🎯",
				"Your commitment to quality is truly impressive! Bravo! 🎭"
			],
			high: [
				"You're solving problems like a pro! 🌈",
				"Your momentum is building beautifully! Keep it up! 🚀",
				"Every fix makes you a stronger developer! Awesome! 💪",
				"You're making your codebase better with each change! 🔥",
				"Your focus is paying off big time! Great work! ✨",
				"You're turning bugs into features! Well done! 🎯",
				"Your skills are leveling up with each fix! 💡",
				"You're proving that persistence wins! Keep going! 🌟",
				"Your code quality is improving rapidly! 📈",
				"You're building confidence with every solution! ⚡",
				"Your problem-solving instincts are sharp! 🎪",
				"You're making complexity look simple! Nice! 🌊",
				"Your dedication to improvement shines through! 🌅",
				"You're crafting cleaner code with each iteration! 🎨",
				"Your technical growth is evident! Keep pushing! 🔋",
				"You're turning obstacles into opportunities! 🌺",
				"Your consistency is your superpower! 🎵",
				"You're debugging like a detective! Impressive! 🔍",
				"Your attention to detail is paying off! 🌻",
				"You're making software better, one fix at a time! 🎬"
			],
			general: [
				"You're making your code better, one fix at a time! 💎",
				"Every bug you squash makes you a stronger developer! 🦸",
				"Your persistence is paying off! Keep up the excellent work! 🔥",
				"Great developers are built through moments like these! ⚡",
				"You're turning challenges into victories! 🏆",
				"Each fix is a step toward mastery! Keep going! 🌟",
				"Your code is evolving, and so are you! 🌱",
				"You're building something great, bit by bit! 🔨",
				"Every improvement counts! You're doing great! 👏",
				"Your journey to better code continues! 🛤️",
				"You're learning and growing with every change! 📚",
				"Small wins add up to big victories! 🎯",
				"Your commitment to quality shows! 💪",
				"You're making progress that matters! ✨",
				"Each fix is proof of your dedication! 🌿",
				"You're crafting better software! Keep it up! �",
				"Your effort is shaping excellent code! 🔧",
				"You're on the path to greatness! 🌈",
				"Every line you improve makes a difference! 💡",
				"You're building your expertise one fix at a time! 🌺",
				"Your code is becoming more robust! 🛡️",
				"You're writing your success story in code! 📖",
				"Each solution brings new understanding! 🔮",
				"You're making software that matters! 🌍",
				"Your growth as a developer is clear! �"
			]
		};
	}

	/**
	 * Helper method to get a random item from an array
	 */
	private randomFrom<T>(array: T[]): T {
		return array[Math.floor(Math.random() * array.length)];
	}

	/**
	 * Convert duration in milliseconds to human-readable description
	 */
	private getTimeDescription(durationMs: number): string {
		const minutes = Math.floor(durationMs / (60 * 1000));
		const hours = Math.floor(durationMs / (60 * 60 * 1000));
		const days = Math.floor(durationMs / (24 * 60 * 60 * 1000));

		if (days >= 1) {
			return `the last ${days} day${days > 1 ? 's' : ''}`;
		} else if (hours >= 1) {
			return `the last ${hours} hour${hours > 1 ? 's' : ''}`;
		} else if (minutes >= 1) {
			return `the last ${minutes} minute${minutes > 1 ? 's' : ''}`;
		}
		return 'the last few moments';
	}

	// Private helper methods

	private generateEventId(type: string, subtype: string, description: string): string {
		// Create a consistent ID based on type, subtype, and description
		return `${type}:${subtype}:${description}`;
	}

	private getDiagnosticSeverityName(severity: vscode.DiagnosticSeverity | undefined): string {
		switch (severity) {
			case vscode.DiagnosticSeverity.Error: return 'error';
			case vscode.DiagnosticSeverity.Warning: return 'warning';
			case vscode.DiagnosticSeverity.Information: return 'info';
			case vscode.DiagnosticSeverity.Hint: return 'hint';
			default: return 'unknown';
		}
	}

	private getFileName(uri: vscode.Uri): string {
		return uri.fsPath.split(/[/\\]/).pop() || uri.fsPath;
	}

	private findUnresolvedTask(taskName: string): string | undefined {
		for (const [id, event] of this.events.entries()) {
			if (
				event.type === 'task' &&
				event.subtype === 'failure' &&
				!event.resolvedTimestamp &&
				event.metadata?.taskName === taskName
			) {
				return id;
			}
		}
		return undefined;
	}

	private saveToStorage(): void {
		const eventsArray = Array.from(this.events.values());
		this.context.globalState.update('statistics_events', eventsArray);
		this.context.globalState.update('statistics_sessionStart', this.sessionStartTime);
	}

	private loadFromStorage(): void {
		const savedEvents = this.context.globalState.get<EventEntry[]>('statistics_events', []);
		const savedSessionStart = this.context.globalState.get<number>('statistics_sessionStart');

		this.events.clear();
		for (const event of savedEvents) {
			this.events.set(event.id, event);
		}

		if (savedSessionStart) {
			this.sessionStartTime = savedSessionStart;
		}
	}
}
