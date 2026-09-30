import { DesignLibraryMarkup } from '@assist/svg';
import { hasPageCreatorEnabled } from '@help-center/lib/utils';
import { __ } from '@wordpress/i18n';

export default {
	slug: 'design-library',
	title: __('Design Library', 'extendify-local'),
	sidebarTitle: __('Explore the Design Library', 'extendify-local'),
	description: __(
		'Full design library customized for each site to easily drop in new sections or create full pages with sections.',
		'extendify-local',
	),
	buttonLabels: {
		completed: __('Revisit', 'extendify-local'),
		notCompleted: __('Explore Design Library', 'extendify-local'),
	},
	link: hasPageCreatorEnabled
		? 'post-new.php?post_type=page&ext-open=1&ext-page-creator-close=1'
		: 'post-new.php?post_type=page&ext-open=1',
	type: 'html-text-button',
	dependencies: { plugins: [] },
	show: () => true,
	backgroundImage: null,
	htmlBefore: () => (
		<DesignLibraryMarkup
			className="pointer-events-none relative hidden h-full min-h-56 w-full overflow-hidden rounded-t-lg border border-gray-300 bg-gray-100 pt-5 lg:block"
			aria-hidden="true"
		/>
	),
};
