import { useTasksStore } from '@assist/state/tasks';
import { useEffect, useState } from '@wordpress/element';

const { frontPage } = window.extSharedData || {};

export const LinkButton = ({ task, completed }) => {
	const [link, setLink] = useState(
		task.slug === 'edit-homepage' ? null : task.link,
	);
	const { completeTask } = useTasksStore();

	useEffect(() => {
		if (task.slug === 'edit-homepage') {
			const split = task.link.split('$');
			setLink(`${split[0]}${frontPage}${split[1]}`);
		}
	}, [task, setLink]);

	return (
		<a
			className="min-w-24 cursor-pointer rounded-xs bg-design-main px-4 py-2.5 text-center text-sm font-medium text-design-text no-underline hover:opacity-90"
			href={window.extSharedData.adminUrl + link}
			onClick={() => completeTask(task.slug)}
		>
			{completed ? task.buttonLabels.completed : task.buttonLabels.notCompleted}
		</a>
	);
};
