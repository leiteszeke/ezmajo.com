import { LaunchDemoSitesMarkup } from '@assist/tasks/images/LaunchDemoSitesMarkup';
import { __ } from '@wordpress/i18n';

const { launchCompleted } = window.extAssistData;
const { themeSlug, showLaunch, useAgentOnboarding } = window.extSharedData;

export default {
	slug: 'site-builder-launcher',
	title: __('Continue with site builder', 'extendify-local'),
	description: __(
		'Create a super-fast, beautiful, and fully customized site in minutes with our Site Launcher.',
		'extendify-local',
	),
	buttonLabels: {
		completed: __('Add Website Details', 'extendify-local'),
		notCompleted: __('Add Website Details', 'extendify-local'),
	},
	link: useAgentOnboarding
		? 'admin.php?page=extendify-auto-launch'
		: 'admin.php?page=extendify-launch',
	type: 'site-launcher-task',
	dependencies: { plugins: [] },
	show: () => {
		return themeSlug === 'extendable' && !launchCompleted && showLaunch;
	},
	backgroundImage: null,
	htmlBefore: () => (
		<LaunchDemoSitesMarkup
			className="border-gray-300 pointer-events-none relative hidden h-full min-h-56 w-full overflow-hidden rounded-t-lg border bg-gray-800 pt-5 lg:block"
			aria-hidden="true"
		/>
	),
};
