import { recordAgentActivity } from '@agent/api';
import { useWorkflowStore } from '@agent/state/workflows';
import { useCallback, useMemo } from '@wordpress/element';

export const useWhenFinishedToolProps = () => {
	const { whenFinishedToolProps, setWhenFinishedToolProps, getWorkflow } =
		useWorkflowStore();

	const onConfirm = useCallback(
		(props = {}) => {
			if (!whenFinishedToolProps) return;
			const workflow = getWorkflow();
			recordAgentActivity({
				sessionId: workflow?.sessionId,
				action: 'workflow_tool_event',
				value: { trigger: 'confirm', workflow: workflow?.id },
			});
			window.dispatchEvent(
				new CustomEvent('extendify-agent:workflow-confirm', {
					detail: { ...props, whenFinishedToolProps },
				}),
			);
		},
		[whenFinishedToolProps, getWorkflow],
	);

	const onCancel = useCallback(() => {
		if (!whenFinishedToolProps) return;
		const workflow = getWorkflow();
		recordAgentActivity({
			sessionId: workflow?.sessionId,
			action: 'workflow_tool_event',
			value: { trigger: 'cancel', workflow: workflow?.id },
		});
		window.dispatchEvent(
			new CustomEvent('extendify-agent:workflow-cancel', {
				detail: { whenFinishedToolProps },
			}),
		);
	}, [whenFinishedToolProps, getWorkflow]);

	const onRetry = useCallback(() => {
		if (!whenFinishedToolProps) return;
		setWhenFinishedToolProps(null);
		const workflow = getWorkflow();
		recordAgentActivity({
			sessionId: workflow?.sessionId,
			action: 'workflow_tool_event',
			value: { trigger: 'retry', workflow: workflow?.id },
		});
		window.dispatchEvent(
			new CustomEvent('extendify-agent:workflow-retry', {
				detail: { whenFinishedToolProps },
			}),
		);
	}, [whenFinishedToolProps, setWhenFinishedToolProps, getWorkflow]);

	return useMemo(() => {
		if (!whenFinishedToolProps) return null;
		return { ...whenFinishedToolProps, onConfirm, onCancel, onRetry };
	}, [whenFinishedToolProps, onConfirm, onCancel, onRetry]);
};
