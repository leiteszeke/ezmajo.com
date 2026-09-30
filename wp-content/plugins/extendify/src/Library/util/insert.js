import { useGlobalsStore } from '@library/state/global';
import { addGlobalCSS, requiredCSSVars } from '@library/util/css';
import { dispatch, select } from '@wordpress/data';

export const insertBlocks = async (blocks) => {
	const { insertBlocks, replaceBlock } = dispatch('core/block-editor');
	const {
		getSelectedBlock,
		getBlockHierarchyRootClientId,
		getBlockIndex,
		getGlobalBlockCount,
		getBlockParents,
		getBlock,
		getBlocks,
	} = select('core/block-editor');

	const renderingModes =
		select('core/preferences').get('core', 'renderingModes') || {};
	const currentTheme = select('core').getCurrentTheme()?.stylesheet;
	const isTemplateShown =
		renderingModes?.[currentTheme]?.page === 'template-locked';

	const { set: setPreference } = dispatch('core/preferences');
	const setRenderingMode = (mode) =>
		setPreference('core', 'renderingModes', {
			...renderingModes,
			[currentTheme]: { ...(renderingModes[currentTheme] || {}), page: mode },
		});

	let { clientId, name, attributes } = getSelectedBlock() || {};

	if (clientId && isTemplateShown) {
		const parentClientIds = getBlockParents(clientId);
		const parentBlocks = parentClientIds
			.map((id) => getBlock(id))
			.filter(Boolean);

		// In "Show Template" mode, the block structure may vary depending on the theme.
		// Typically, we have something like: <main> → post-content → section/group.
		// However, themes may introduce intermediate wrappers like group/template-part.
		// So instead of assuming fixed indexes, we dynamically find the 'core/post-content' (always present)
		// block among the parents and select the block immediately after it.
		// This ensures we always get the main section block nested inside post-content.
		const postContentIndex = parentBlocks.findIndex(
			(block) => block?.name === 'core/post-content',
		);
		const sectionBlockClientId =
			postContentIndex !== -1
				? parentBlocks[postContentIndex + 1]?.clientId || clientId
				: clientId;
		const sectionBlockIndex = getBlockIndex(sectionBlockClientId);

		setRenderingMode('post-only');
		await new Promise((resolve) => requestAnimationFrame(resolve));

		const updatedBlocks = getBlocks();
		const updatedSelectedBlock = updatedBlocks[sectionBlockIndex];
		({ clientId, name, attributes } = updatedSelectedBlock || {});
	}

	const rootClientId = clientId ? getBlockHierarchyRootClientId(clientId) : '';
	const insertPointIndex =
		(rootClientId ? getBlockIndex(rootClientId) : getGlobalBlockCount()) + 1;

	// If there are spacing vars in state, we need to add them to the dom
	const { missingCSSVars } = useGlobalsStore.getState();
	missingCSSVars.forEach((key) => {
		// Add variables to the dom
		document?.documentElement?.style?.setProperty(key, requiredCSSVars[key]);
		// Editor might be nested in an iframe too
		document
			.querySelector('iframe[name="editor-canvas"]')
			?.contentDocument?.documentElement?.style?.setProperty(
				key,
				requiredCSSVars[key],
			);
	});

	// We also need to add them to global styles too
	if (missingCSSVars.length) addGlobalCSS(missingCSSVars);

	try {
		// Ensure showTemplate is off even if no block was selected above
		if (isTemplateShown && !clientId) {
			setRenderingMode('post-only');
			await new Promise((resolve) => requestAnimationFrame(resolve));
		}

		if (name === 'core/paragraph' && attributes?.content?.text === '') {
			return await replaceBlock(clientId, blocks);
		}

		return await insertBlocks(blocks, insertPointIndex);
	} finally {
		if (isTemplateShown) setRenderingMode('template-locked');
	}
};
