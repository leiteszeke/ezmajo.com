import { useTasksStore } from '@assist/state/tasks';

export const EventButton = ({ task, completed }) => {
	const { completeTask } = useTasksStore();

	return (
		<button
			type="button"
			className="min-w-24 rounded-xs bg-design-main px-4 py-2.5 text-sm font-medium text-design-text hover:opacity-90"
			onClick={() => {
				window.dispatchEvent(task.event);
				completeTask(task.slug);
			}}
		>
			{completed ? task.buttonLabels.completed : task.buttonLabels.notCompleted}
		</button>
	);
};
