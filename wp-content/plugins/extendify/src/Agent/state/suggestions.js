import { enhanceDomainSuggestion } from '@agent/lib/domain-suggestion';
import { notificationSuggestion } from '@agent/lib/notification-suggestion';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const suggestion = notificationSuggestion();
const pluginSuggestions = (window.extAgentData?.suggestions || [])
	.map(enhanceDomainSuggestion)
	.concat(suggestion ? [suggestion] : [])
	.filter(Boolean)
	.map((s) => ({
		...s,
		source: s.source ?? 'plugin',
	}));

const state = (set, get) => ({
	suggestions: pluginSuggestions,
	addSuggestions: (suggestions) => {
		const mapped = (Array.isArray(suggestions) ? suggestions : [])
			.filter((s) => s.workflowId && s.label)
			.map((s) => ({
				workflowId: s.workflowId,
				message: s.label,
				icon: s.icon ?? 'sparkle',
				source: s.source ?? 'workflow',
				available: s.available,
				addedAt: Date.now(),
				seenAt: null,
				clickedAt: null,
			}));
		if (mapped.length === 0) return;
		set((prev) => {
			// Remove any duplicated suggestions based on the message.
			const messagesSet = new Set(mapped.map((s) => s.message));
			const filtered = prev.suggestions.filter(
				(item) => !messagesSet.has(item.message),
			);
			return { suggestions: [...mapped, ...filtered] };
		});
	},
	// Returns sorted suggestions for display.
	// Note: workflow suggestions are not persistent by design, they are removed from the state when seen.
	// Sort order: workflow first (newest added), then plugin (unseen first, then oldest seen).
	getNextSuggestions: ({ exclude = [] } = {}) => {
		const excludeIds = new Set(exclude.map((s) => s.workflowId));
		const { suggestions } = get();
		return (
			suggestions
				// Exclude any passed in
				.filter((i) => !excludeIds.has(i.workflowId))
				// Remove any that arent available
				.filter((s) => get().isAvailable(s))
				// Oldest seen first.
				.toSorted((a, b) => (a.seenAt ?? 0) - (b.seenAt ?? 0))
				// Unseen before seen.
				.toSorted((a, b) => (a.seenAt ? 1 : 0) - (b.seenAt ? 1 : 0))
				// Workflows sorted by newest added.
				.toSorted((a, b) => {
					if ([a.source, b.source].includes('plugin')) return 0;
					return (b.addedAt ?? 0) - (a.addedAt ?? 0);
				})
				// Workflows before plugins.
				.toSorted(
					(a, b) =>
						(a.source === 'plugin' ? 1 : 0) - (b.source === 'plugin' ? 1 : 0),
				)
		);
	},
	// Returns the top N suggestions and marks them as seen.
	getSuggestions: ({ slice = 3, exclude = [] } = {}) => {
		const results = get().getNextSuggestions({ exclude }).slice(0, slice);
		get().markAsSeen(results);
		return results;
	},
	isAvailable: (s) => {
		const { context, abilities } = window.extAgentData ?? {};
		const { context: reqContext, abilities: reqAbilities } = s.available ?? {};

		// Skip ability checks if abilities are not yet known.
		if (reqAbilities && !reqAbilities.every((key) => abilities?.[key])) {
			return false;
		}

		// If not context check were good.
		if (!reqContext) return true;

		const checks = Array.isArray(reqContext)
			? // If it's an array, truthy check
				reqContext.every((key) => context?.[key])
			: // If it's an object, check the value
				Object.entries(reqContext).every(
					([key, val]) => context?.[key] === val,
				);

		return checks;
	},
	markAsSeen: (items) => {
		const messages = new Set(items.map((s) => s.message));
		set((prev) => ({
			suggestions: prev.suggestions.map((s) => {
				if (s.seenAt || !messages.has(s.message)) return s;
				return { ...s, seenAt: Date.now() };
			}),
		}));
	},
	markAsClicked: (suggestion) =>
		set((prev) => ({
			suggestions: prev.suggestions.map((item) => {
				if (item.message !== suggestion.message) return item;
				return { ...item, clickedAt: Date.now() };
			}),
		})),
});

export const useSuggestionsStore = create()(
	persist(
		devtools(state, {
			name: 'Extendify Agent Suggestions',
			enabled: window.extSharedData.devbuild,
		}),
		{
			name: `extendify-agent-suggestions-${window.extSharedData.siteId}`,
			// Reconcile persisted state with fresh plugin suggestions on hydration.
			merge: (persisted, current) => {
				const persistedSuggestions = persisted?.suggestions ?? [];

				// 1. for plugin suggestions, the plugin is the source of truth,
				//    but we keep any dynamic state
				// 2. This also filters out the workflow suggestions and any others
				//    which we might want to have an expire prop instead
				const suggestions = pluginSuggestions.map((s) => {
					const p = persistedSuggestions.find((ps) => ps.id === s.id);
					return {
						...s,
						seenAt: p?.seenAt,
						clickedAt: p?.clickedAt,
					};
				});
				return { ...current, suggestions };
			},
		},
	),
);
