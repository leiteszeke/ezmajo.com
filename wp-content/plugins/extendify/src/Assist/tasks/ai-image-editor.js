import { AiImageGeneratorMarkup } from '@assist/tasks/images/AiImageGeneratorMarkup';
import { hasPageCreatorEnabled } from '@help-center/lib/utils';
import { __ } from '@wordpress/i18n';

export default {
	slug: 'ai-image-editor',
	title: __('AI Image Generator', 'extendify-local'),
	sidebarTitle: __('Generate an image with AI', 'extendify-local'),
	description: __(
		'Generate AI images or search for images to bring a website to life.',
		'extendify-local',
	),
	buttonLabels: {
		completed: __('Revisit', 'extendify-local'),
		notCompleted: __('Start Generating with AI', 'extendify-local'),
	},
	link: hasPageCreatorEnabled
		? 'post-new.php?post_type=page&ext-page-creator-close=1&ext-close=1&ext-add-image-block=1'
		: 'post-new.php?post_type=page&ext-close=1&ext-add-image-block=1',
	type: 'html-text-button',
	dependencies: { plugins: [] },
	show: () => !!window.extSharedData?.showDraft,
	backgroundImage: null,
	htmlBefore: () => (
		<AiImageGeneratorMarkup
			className="border-gray-300 pointer-events-none relative hidden h-full min-h-56 w-full overflow-hidden rounded-t-lg border bg-gray-100 pt-5 lg:block"
			aria-hidden="true"
		/>
	),
};
