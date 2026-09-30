import { Dashboard } from '@page-creator/pages/Dashboard';
import { GeneratingPage } from '@page-creator/pages/GeneratingPage';

export const initialPagesList = {
	'ai-dashboard': {
		component: Dashboard,
	},
	'generating-page': {
		component: GeneratingPage,
	},
};

export const getPages = () => Object.entries(initialPagesList);

export const pages = getPages();
