import { __ } from '@wordpress/i18n';

// The backend owns their descriptions; this is what this build can run.
const IMPLEMENTED = ['acquire-image'];

export const getClientTools = () => {
	const { abilities } = window.extAgentData ?? {};
	if (!abilities?.canUploadMedia) return [];
	return IMPLEMENTED;
};

// Keeps the tool's UI from appearing in chat unexplained when the lead-in is empty.
export const getClientToolFallbackReply = (toolId) =>
	toolId === 'acquire-image'
		? __(
				'Select or generate an image below, or press Skip to continue without one.',
				'extendify-local',
			)
		: null;
