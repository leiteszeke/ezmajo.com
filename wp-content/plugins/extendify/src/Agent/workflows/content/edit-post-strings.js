import { BLOCK_ID_SEL } from '@agent/lib/block-el';
import { UpdatePostConfirm } from '@agent/workflows/content/components/UpdatePostConfirm';

const { context, abilities } = window.extAgentData;

// A wrapper carries its children's text, so counting it repeats every string.
const ownText = (el) => {
	let text = '';
	for (const node of el.childNodes) {
		if (node.nodeType === Node.TEXT_NODE) text += node.nodeValue;
	}
	return text.replace(/\s+/g, ' ').trim();
};

// One string is select-block's job; this earns its place on several.
const hasSeveralStrings = () => {
	const strings = new Set();
	for (const el of document.querySelectorAll(BLOCK_ID_SEL)) {
		const text = ownText(el);
		if (text) strings.add(text);
		if (strings.size > 1) return true;
	}
	return false;
};

export default {
	available: () =>
		abilities?.canEditPosts &&
		!context?.adminPage &&
		context?.postId &&
		!context?.isBlogPage &&
		context.usingBlockEditor &&
		hasSeveralStrings(),
	id: 'edit-post-strings',
	whenFinished: { component: UpdatePostConfirm },
};
