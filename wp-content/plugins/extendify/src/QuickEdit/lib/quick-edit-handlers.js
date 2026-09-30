// Single source of truth for "does Quick Edit have an editor for this
// blockType?" — hover-bar uses it to gate the Quick Edit pill, and
// keyboard-entry uses it to skip opening an editor for blocks that
// only get Ask AI. InlineEditor still owns the actual handler routing;
// if a type is in this set but InlineEditor has no branch, the user
// sees UnsupportedNotice (self-healing safety net).
//
// Keep aligned with TEXT_STRATEGIES + PICKER_STRATEGIES +
// MODAL_BLOCK_TYPES in components/InlineEditor.jsx.
export const QUICK_EDIT_BLOCK_TYPES = new Set([
	'core/paragraph',
	'core/heading',
	'core/button',
	'core/image',
	'core/cover',
	'core/media-text:image',
	'product:image',
	'core/site-title',
	'core/site-tagline',
	'core/site-logo',
	'core/social-link',
	'core/navigation-link',
	'core/navigation-submenu',
	'product:name',
	'product:short_description',
	'product:description',
	'product:price',
	'wpforms:field',
]);

export const hasQuickEditModalFor = (blockType) =>
	!!blockType && QUICK_EDIT_BLOCK_TYPES.has(blockType);
