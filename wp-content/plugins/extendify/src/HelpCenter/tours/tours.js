import { hasPageCreatorEnabled } from '@help-center/lib/utils';
import libraryTour from '@help-center/tours/library-tour';
import pageCreator from '@help-center/tours/page-creator';
import pageEditor from '@help-center/tours/page-editor';
import pluginInstall from '@help-center/tours/plugin-install';
import pluginManagement from '@help-center/tours/plugin-management';
import siteAssistant from '@help-center/tours/site-assistant';
// import styleEditor from '@help-center/tours/style-editor.js';
import usersScreen from '@help-center/tours/users-screen.js';
import welcomeTour from '@help-center/tours/welcome.js';
import { addFilter, applyFilters } from '@wordpress/hooks';

const tours = {
	'welcome-tour': welcomeTour,
	'plugin-install-tour': pluginInstall,
	'plugin-management-tour': pluginManagement,
	'page-editor-tour': pageEditor,
	'library-tour': libraryTour,
	// 'style-editor-tour': styleEditor,
	'users-screen-tour': usersScreen,
	'site-assistant-tour': siteAssistant,
};

addFilter('extendify.tours', 'extendify/extra-tours', (tours) => {
	if (!hasPageCreatorEnabled) return tours;
	return { ...tours, 'page-creator-tour': pageCreator };
});

export default applyFilters('extendify.tours', tours);
