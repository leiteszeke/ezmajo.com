import { ImageUploader } from '@assist/components/ImageUploader';
import { useTasksStore } from '@assist/state/tasks';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export const UpdateSiteIcon = ({ setModalTitle }) => {
	const { completeTask } = useTasksStore();
	const updateTask = () => {
		completeTask('site-icon');
	};

	useEffect(() => {
		setModalTitle(__('Upload site icon', 'extendify-local'));
	}, [setModalTitle]);

	return (
		<ImageUploader
			type="site_icon"
			title={__('Site icon', 'extendify-local')}
			actionLabel={__('Set site icon', 'extendify-local')}
			onUpdate={updateTask}
		/>
	);
};
