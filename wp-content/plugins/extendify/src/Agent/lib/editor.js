import { dispatch, select } from '@wordpress/data';

export const getRenderingMode = () => {
	const renderingModes =
		select('core/preferences').get('core', 'renderingModes') || {};
	const currentTheme = select('core').getCurrentTheme()?.stylesheet;
	return renderingModes?.[currentTheme]?.page;
};
export const setRenderingMode = async (mode) => {
	const renderingModes =
		select('core/preferences').get('core', 'renderingModes') || {};
	const currentTheme = select('core').getCurrentTheme()?.stylesheet;
	dispatch('core/preferences').set('core', 'renderingModes', {
		...renderingModes,
		[currentTheme]: { ...(renderingModes[currentTheme] || {}), page: mode },
	});
	return await new Promise((resolve) => requestAnimationFrame(resolve));
};
