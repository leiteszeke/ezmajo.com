import { useSiteAssistTourStorage } from '@assist/state/site-assist-tour';
import { useTasksStore } from '@assist/state/tasks';
import { useEffect } from '@wordpress/element';

export const useTours = () => {
	const { finishedTour, updateSiteAssistTourStatus } =
		useSiteAssistTourStorage();

	const { completeTask } = useTasksStore();

	useEffect(() => {
		if (!finishedTour('site-assistant-tour')) {
			const handle = (event) => {
				const { isFinished } = event.detail;
				if (isFinished) {
					updateSiteAssistTourStatus('site-assistant-tour');
					completeTask('site-assistant-tour');
				}
			};

			window.addEventListener('extendify-assist:is-tour-finished', handle);
		}
	}, [updateSiteAssistTourStatus, finishedTour, completeTask]);

	return { finishedTour };
};
