// These render a site setting's value, so their text is nowhere in the block
// markup — the schema has to offer it and the patch has to write the row.
export const SETTING_TEXT_BLOCKS = {
	'core/site-title': 'title',
	'core/site-tagline': 'description',
};
