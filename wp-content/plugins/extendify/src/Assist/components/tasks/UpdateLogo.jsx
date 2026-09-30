import { ImageUploader } from '@assist/components/ImageUploader';
import { useTasksStore } from '@assist/state/tasks';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export const UpdateLogo = ({ setModalTitle }) => {
	const { completeTask } = useTasksStore();
	const updateTask = () => {
		completeTask('logo');
	};

	useEffect(() => {
		setModalTitle(__('Upload site logo', 'extendify-local'));
	}, [setModalTitle]);

	return (
		<ImageUploader
			type="site_logo"
			title={__('Site logo', 'extendify-local')}
			actionLabel={__('Set site logo', 'extendify-local')}
			onUpdate={updateTask}
		/>
	);
};
