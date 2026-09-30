import { addFilter, applyFilters } from '@wordpress/hooks';

const aiPageTours = {
	'plugin-install.php': 'plugin-install-tour',
	'plugins.php': 'plugin-management-tour',
	'post-new.php?post_type=page': 'page-editor-tour',
	'post-new.php?post_type=post': 'library-tour',
	'users.php': 'users-screen-tour',
	'admin.php?page=extendify-assist': 'site-assistant-tour',
};

addFilter(
	'extendify.ai-agent-suggestion-tours',
	'extendify/ai-agent-extra-tours',
	(aiPageTours) => {
		if (!window.extSharedData?.showAIPageCreation) return aiPageTours;
		return {
			...aiPageTours,
			'post-new.php?post_type=page': 'page-creator-tour',
		};
	},
);

export default applyFilters('extendify.ai-agent-suggestion-tours', aiPageTours);
