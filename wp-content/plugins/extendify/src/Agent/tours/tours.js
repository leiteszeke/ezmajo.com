import libraryTour from '@agent/tours/library-tour';
import pageCreator from '@agent/tours/page-creator';
import pageEditor from '@agent/tours/page-editor';
import pluginInstall from '@agent/tours/plugin-install';
import pluginManagement from '@agent/tours/plugin-management';
import siteAssistant from '@agent/tours/site-assistant';
// import styleEditor from '@agent/tours/style-editor.js';
import usersScreen from '@agent/tours/users-screen.js';
import { addFilter, applyFilters } from '@wordpress/hooks';

// import welcomeTour from '@agent/tours/welcome.js';

const tours = {
	// 'welcome-tour': welcomeTour,
	'plugin-install-tour': pluginInstall,
	'plugin-management-tour': pluginManagement,
	'page-editor-tour': pageEditor,
	'library-tour': libraryTour,
	// 'style-editor-tour': styleEditor,
	'users-screen-tour': usersScreen,
	'site-assistant-tour': siteAssistant,
};

addFilter('extendify.tours', 'extendify/extra-tours', (tours) => {
	if (!window.extSharedData?.showAIPageCreation) return tours;
	return { ...tours, 'page-creator-tour': pageCreator };
});

export default applyFilters('extendify.tours', tours);
