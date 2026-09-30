import { HelpCenterAIMarkup } from '@assist/tasks/images/HelpCenterAIMarkup';
import { __ } from '@wordpress/i18n';

export default {
	slug: 'help-center-ai',
	title: __('AI-Powered Help Center', 'extendify-local'),
	sidebarTitle: __('Experience the AI-Powered Help Center', 'extendify-local'),
	description: __(
		'Get instant support with Co-Pilot AI, explore our Knowledge Base, or take guided tours to make the most of our tools.',
		'extendify-local',
	),
	buttonLabels: {
		completed: __('Revisit', 'extendify-local'),
		notCompleted: __('Explore Help Center', 'extendify-local'),
	},
	type: 'html-text-button',
	event: new CustomEvent('extendify-hc:open', { detail: { page: 'ai-chat' } }),
	dependencies: { plugins: [] },
	show: () =>
		!!window.extSharedData?.showChat &&
		!(
			!!window.extSharedData?.launchCompletedAt &&
			!!window.extSharedData?.showAIAgents
		),
	htmlBefore: () => (
		<HelpCenterAIMarkup
			className="border-gray-300 pointer-events-none relative hidden h-full min-h-56 w-full overflow-hidden rounded-t-lg border bg-gray-100 pt-5 lg:block"
			aria-hidden="true"
		/>
	),
};
