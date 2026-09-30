import apiFetch from '@wordpress/api-fetch';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';

const path = '/extendify/v1/agent/site-navigation';

const blockPattern = /<!--\s+(\/)?wp:([\w/-]+)\s*(\{.*?\})?\s*(\/)?-->/g;
const navigationPattern = /<!--\s+wp:navigation\s+(\{.*?\})\s*\/?-->/g;

const attributes = (json) => {
	if (!json) return {};
	try {
		return JSON.parse(json);
	} catch {
		return {};
	}
};

const withoutEmpties = (items) =>
	items.map(({ items: children, ...item }) =>
		children?.length ? { ...item, items: withoutEmpties(children) } : item,
	);

const entries = (content = '') => {
	const root = { items: [] };
	const open = [root];
	for (const [, closing, name, json, selfClosing] of content.matchAll(
		blockPattern,
	)) {
		if (closing) {
			if (open.length > 1) open.pop();
			continue;
		}

		const { label, url } = attributes(json);
		const item = {
			type: name.replace('core/', ''),
			...(label && { label: decodeEntities(label) }),
			...(url && { url }),
		};
		open.at(-1).items.push(item);
		if (!selfClosing) {
			item.items = [];
			open.push(item);
		}
	}

	return withoutEmpties(root.items);
};

const menusRenderedIn = async (location) => {
	const parts = await apiFetch({ path: '/wp/v2/template-parts?context=edit' });

	return parts
		.filter((part) => part.area === location)
		.flatMap((part) => [
			...(part.content?.raw ?? '').matchAll(navigationPattern),
		])
		.map(([, json]) => attributes(json).ref)
		.filter(Boolean);
};

export const navigation = {
	name: 'extendify/navigation',
	label: __('Menus', 'extendify-local'),
	description:
		'The menus this site has and what each one links to, as a list rather than the markup it is stored as. Ask for a place on the page for the menu a visitor sees there, or for a menu by id.',
	inputSchema: {
		type: 'object',
		properties: {
			location: {
				type: 'string',
				enum: ['header', 'footer'],
				description: 'Where on the page the menu is shown.',
			},
			menuId: {
				type: 'integer',
				description: 'One menu, by the id another tool returned.',
			},
		},
	},
	annotations: { readonly: true },
	execute: async ({ location, menuId } = {}) => {
		const ids = menuId
			? [menuId]
			: location
				? await menusRenderedIn(location)
				: [];
		if (location && !ids.length) {
			return { error: `No menu is rendered in the ${location}.` };
		}

		const menus = await apiFetch({
			path,
			method: 'POST',
			data: ids.length ? { only: ids.join(',') } : {},
		});

		return {
			menus: menus.map(({ id, name, content }) => ({
				id,
				name: decodeEntities(name),
				items: entries(content),
			})),
		};
	},
};
