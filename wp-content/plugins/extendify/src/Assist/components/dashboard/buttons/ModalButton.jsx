import { UpdateLogo } from '@assist/components/tasks/UpdateLogo';
import { UpdateSiteDescription } from '@assist/components/tasks/UpdateSiteDescription';
import { UpdateSiteIcon } from '@assist/components/tasks/UpdateSiteIcon';
import { useGlobalStore } from '@assist/state/globals';

export const ModalButton = ({ task, completed }) => {
	const { pushModal } = useGlobalStore();

	const Components = {
		logo: UpdateLogo,
		'site-description': UpdateSiteDescription,
		'site-icon': UpdateSiteIcon,
	};

	if (!Components[task.slug]) return null;

	return (
		<button
			type="button"
			className="min-w-24 rounded-xs bg-design-main px-4 py-2.5 text-sm font-medium text-design-text hover:opacity-90"
			onClick={() => pushModal(Components[task.slug])}
		>
			{completed ? task.buttonLabels.completed : task.buttonLabels.notCompleted}
		</button>
	);
};
