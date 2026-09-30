import { AiWritingAssistantMarkup } from '@assist/tasks/images/AiWritingAssistantMarkup';
import { hasPageCreatorEnabled } from '@help-center/lib/utils';
import { __ } from '@wordpress/i18n';

export default {
	slug: 'ai-text-editor',
	title: __('AI Writing Assistant', 'extendify-local'),
	sidebarTitle: __('Edit a page with AI', 'extendify-local'),
	description: __(
		'Get to know your WordPress site easily. Learn simple steps to find and use its main features.',
		'extendify-local',
	),
	buttonLabels: {
		completed: __('Revisit', 'extendify-local'),
		notCompleted: __('Start Writing with AI', 'extendify-local'),
	},
	link: hasPageCreatorEnabled
		? 'post-new.php?post_type=page&ext-page-creator-close=1'
		: 'post-new.php?post_type=page&ext-close=1',
	type: 'html-text-button',
	dependencies: { plugins: [] },
	show: () => !!window.extSharedData?.showDraft,
	backgroundImage: null,
	htmlBefore: () => (
		<AiWritingAssistantMarkup
			className="border-gray-300 pointer-events-none relative hidden h-full min-h-56 w-full overflow-hidden rounded-t-lg border bg-gray-100 pt-5 lg:block"
			aria-hidden="true"
		/>
	),
};
