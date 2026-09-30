// Single source for the agent-block selection-descriptor shape so
// DOMHighlighter's click commit and ask-ai's pill click can't drift on
// which metadata flags exist or how they're detected.

import { detectBlockType } from '@quick-edit/lib/dom';

const AGENT_ATTR = 'data-extendify-agent-block-id';
const PART_ID_ATTR = 'data-extendify-part-block-id';
const PART_ATTR = 'data-extendify-part';
const PART_SLUG_ATTR = 'data-extendify-part-slug';

export const buildAgentBlockDescriptor = (match) => {
	if (!match) return null;
	const templatePart = match.closest?.(`[${PART_ATTR}]`);
	const details = {
		id: match.getAttribute(AGENT_ATTR),
		target: AGENT_ATTR,
		// local-pick + classify-block-edit gate on this; without it every edit
		// falls through to find-agent.
		blockType: detectBlockType(match),
		hasNav:
			!!match.querySelector('.wp-block-navigation') ||
			match.classList.contains('wp-block-navigation'),
		hasSiteTitle:
			match.classList.contains('wp-block-site-title') ||
			!!match.querySelector('.wp-block-site-title'),
		hasSiteLogo:
			match.classList.contains('wp-block-site-logo') ||
			!!match.querySelector('.wp-block-site-logo'),
		hasLinks: !!match.querySelector('a') || match.tagName === 'A',
		hasImages:
			!!match.querySelector('.wp-block-image') ||
			match.classList.contains('wp-block-image') ||
			!!match.querySelector('img'),
		hasText: /\S/.test((match.textContent || '').replace(/​/g, '')),
	};
	if (templatePart) {
		details.id = templatePart.getAttribute(PART_ID_ATTR);
		details.target = PART_ID_ATTR;
		details.template = templatePart.getAttribute(PART_ATTR);
		// Part ids number their own space; without the scope the agent's read
		// and save land on the page post's block of the same number.
		details.source = {
			kind: 'template-part',
			partSlug: templatePart.getAttribute(PART_SLUG_ATTR) || '',
		};
	}
	return details;
};
