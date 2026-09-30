import { isAbilityWorkflow } from '@agent/lib/abilities';
import { AbilityRun } from '@agent/workflows/abilities/components/run';
import { abilityWorkflows, workflows } from '@agent/workflows/workflows';
import { useQuickEditStore } from '@quick-edit/state/store';
import { deepMerge } from '@shared/lib/utils';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Used to check case-insensitive matches for workflow examples
const collator = new Intl.Collator(undefined, {
	sensitivity: 'base',
	usage: 'search',
});

const state = (set, get) => ({
	workflow: null,
	// Data for the tool component that shows up at the end of a workflow
	whenFinishedToolProps: null,
	getWorkflow: () => {
		const curr = get().workflow;
		// Workflows may define a "parent" workflow via templateId
		const currId = curr?.templateId || curr?.id;
		const wf = workflows.find(({ id }) => id === currId);
		if (!wf?.id) {
			if (!curr) return null;
			if (!isAbilityWorkflow(curr.id)) return curr;
			// The backend never sends whenFinished, so this supplies the gate.
			const ability = deepMerge(
				{ whenFinished: { component: AbilityRun } },
				abilityWorkflows[curr.id] ?? {},
			);
			return { ...deepMerge(curr, ability), id: curr.id };
		}
		return { ...deepMerge(curr, wf || {}), id: curr?.id };
	},
	getWorkflowByExample: (example) => {
		const wf = workflows.find(
			({ example: ex }) => collator.compare(ex?.text, example) === 0,
		);
		if (!wf?.id) return null;
		if (!wf.available()) return null;
		return wf;
	},
	// Gets the workflows available to the user
	// TODO: maybe we need to have a way to include a
	// workflow regardless of the block being active?
	getAvailableWorkflows: () => {
		const wfs = workflows.filter(({ available }) => available());
		// If a block is set, only include those with 'block'
		const blockWorkflows = wfs.filter(({ requires }) =>
			requires?.includes('block'),
		);
		if (useQuickEditStore.getState().agentBlock) return blockWorkflows;
		// otherwise remove all of the above
		return wfs.filter(({ id }) => !blockWorkflows.some((w) => w.id === id));
	},
	getWorkflowsByFeature: ({ requires } = {}) => {
		if (!requires) return workflows.filter(({ available }) => available());
		// e.g. requires: ['block']
		return workflows.filter(
			({ available, requires: workflowRequires }) =>
				available() &&
				(!requires || workflowRequires?.some((s) => requires.includes(s))),
		);
	},
	workflowData: null,
	mergeWorkflowData: (data) => {
		set((state) => {
			if (!state.workflowData) return { workflowData: data };
			return {
				workflowData: { ...state.workflowData, ...data },
			};
		});
	},
	setWorkflow: (workflow) => {
		const agentBlockCode = useQuickEditStore.getState().agentBlockCode;
		const started = workflow
			? { ...workflow, startingPage: window.location.href }
			: null;
		set({
			workflow: started,
			// If a block is selected, add it to the workflow data
			// previousContent is named this way for legacy reasons
			workflowData: agentBlockCode ? { previousContent: agentBlockCode } : null,
			whenFinishedToolProps: null,
		});
		if (!started) return;
		const workflowStarted = get().getWorkflow();
		window.dispatchEvent(
			new CustomEvent('extendify-workflow::started', {
				detail: workflowStarted,
			}),
		);
		try {
			workflowStarted?.onStarted?.(workflowStarted);
		} catch {
			// A workflow that can't read the page still has to start.
		}
	},
	setWhenFinishedToolProps: (whenFinishedToolProps) =>
		set({ whenFinishedToolProps }),
	// Declared up front it would hide the workflow while nothing is staged.
	// Not setWorkflow: that resets workflowData and drops the run's data.
	requireBlock: () =>
		set((state) =>
			state.workflow
				? { workflow: { ...state.workflow, requires: ['block'] } }
				: {},
		),
});

export const useWorkflowStore = create()(
	persist(devtools(state, { name: 'Extendify Agent Workflows' }), {
		name: `extendify-agent-workflows-${window.extSharedData.siteId}`,
		merge: (persistedState, currentState) => {
			const merged = { ...currentState, ...persistedState };
			// A reload can't carry the staged block a block-patching workflow
			// depends on, so a rehydrated-open one is always stale. A canvas
			// session is stale too: its field values never persist.
			const id = merged.workflow?.templateId || merged.workflow?.id;
			const registered = workflows.find((wf) => wf.id === id);
			if (id === 'block-patching' || registered?.whenFinished?.canvas) {
				return {
					...merged,
					workflow: null,
					whenFinishedToolProps: null,
					workflowData: null,
				};
			}
			return merged;
		},
	}),
);
