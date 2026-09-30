import {
	BG_SOURCE_ATTR,
	DESIGN_ROOT_ATTR,
} from '@auto-launch/functions/tokens';

// A design may carry a variable this build predates; anything else is not ours.
const DESIGN_VAR = /^--ext-(ui|tpl)-[a-z0-9-]+$/;

let logo;

// The design is read once before the first paint, so the parts read it from here.
export const chooseLogo = (source) => {
	logo = source;
};

export const activeLogo = () => logo;

export const designRoot = () => document.querySelector(`[${DESIGN_ROOT_ATTR}]`);

export const applyBgSource = (node, source) => {
	if (source) node.setAttribute(BG_SOURCE_ATTR, source);
	else node.removeAttribute(BG_SOURCE_ATTR);
};

// Never on :root, or everything outside the flow is repainted with it.
export const applyDesign = (node, design) => {
	if (!node || !design) return;
	for (const [name, value] of Object.entries(design.vars ?? {})) {
		if (DESIGN_VAR.test(name)) node.style.setProperty(name, value);
	}
	node.setAttribute(DESIGN_ROOT_ATTR, '');
	applyBgSource(node, design.shader);
};
