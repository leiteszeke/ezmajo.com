import { EventButton } from '@assist/components/dashboard/buttons/EventButton';
import { LinkButton } from '@assist/components/dashboard/buttons/LinkButton';
import { ModalButton } from '@assist/components/dashboard/buttons/ModalButton';
import { TourButton } from '@assist/components/dashboard/buttons/TourButton';
import { useTours } from '@assist/hooks/useTours';
import { useTasksStore } from '@assist/state/tasks';

export const ActionButton = ({ task }) => {
	const { isCompleted } = useTasksStore();
	const { finishedTour } = useTours();

	if (task.event) {
		return <EventButton task={task} completed={isCompleted(task.slug)} />;
	}

	if (task.type === 'modal')
		return <ModalButton task={task} completed={isCompleted(task.slug)} />;

	if (['html-text-button', 'internalLink'].includes(task.type))
		return <LinkButton task={task} completed={isCompleted(task.slug)} />;

	if (task.type === 'tour')
		return (
			<TourButton
				task={task}
				completed={finishedTour(task.slug) || isCompleted(task.slug)}
			/>
		);
	return null;
};
