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
