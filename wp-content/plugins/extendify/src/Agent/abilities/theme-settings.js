import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

const reads = ['colors', 'fonts', 'variations'];

const activeStylesheet = async () => {
	const themes = await apiFetch({ path: '/wp/v2/themes?status=active' });
	return themes[0]?.stylesheet;
};

const preset = (value) =>
	Array.isArray(value)
		? value
		: (value?.custom ?? value?.theme ?? value?.default);

const currentDesign = async (stylesheet) => {
	const { globalStylesPostID } = window.extSharedData;
	const [theme, user] = await Promise.all([
		apiFetch({
			path: `/wp/v2/global-styles/themes/${stylesheet}?context=edit`,
		}),
		globalStylesPostID
			? apiFetch({
					path: `/wp/v2/global-styles/${globalStylesPostID}?context=edit`,
				})
			: null,
	]);
	return { theme, user };
};

const colors = ({ theme, user }) =>
	(
		preset(user?.settings?.color?.palette) ??
		preset(theme?.settings?.color?.palette) ??
		[]
	).map(({ name, slug, color }) => ({ name, slug, color }));

const named = (value, families) => {
	const slug = value?.match(/font-family--([\w-]+)/)?.[1] ?? value;
	return families.find((family) => family.slug === slug)?.name ?? slug;
};

const fonts = ({ theme, user }) => {
	const families = [
		...(preset(user?.settings?.typography?.fontFamilies) ?? []),
		...(preset(theme?.settings?.typography?.fontFamilies) ?? []),
	];

	return {
		body: named(
			user?.styles?.typography?.fontFamily ??
				theme?.styles?.typography?.fontFamily,
			families,
		),
		heading: named(
			user?.styles?.elements?.heading?.typography?.fontFamily ??
				theme?.styles?.elements?.heading?.typography?.fontFamily,
			families,
		),
	};
};

const styleVariations = async (stylesheet) => {
	const offered = await apiFetch({
		path: `/wp/v2/global-styles/themes/${stylesheet}/variations`,
	});

	return offered
		.filter(({ title }) => title)
		.map(({ title, slug }) => ({
			title,
			slug: slug ?? title.toLowerCase().trim().replace(/\s+/g, '-'),
		}));
};

export const themeSettings = {
	name: 'extendify/theme-settings',
	label: __('Design settings', 'extendify-local'),
	description:
		'The design this site is set to: the colours in its palette, the fonts its text is set in, and the style variations its theme offers to switch between.',
	inputSchema: {
		type: 'object',
		properties: {
			include: {
				type: 'array',
				items: { type: 'string', enum: reads },
				description: 'Which of these to return. Omit it for all of them.',
			},
		},
	},
	annotations: { readonly: true },
	execute: async ({ include } = {}) => {
		const wanted = include?.length
			? include.filter((key) => reads.includes(key))
			: reads;
		const stylesheet = await activeStylesheet();
		if (!stylesheet) return { error: 'The active theme could not be read.' };

		const design =
			wanted.includes('colors') || wanted.includes('fonts')
				? await currentDesign(stylesheet)
				: null;

		return {
			...(wanted.includes('colors') && { colors: colors(design) }),
			...(wanted.includes('fonts') && { fonts: fonts(design) }),
			...(wanted.includes('variations') && {
				variations: await styleVariations(stylesheet),
			}),
		};
	},
};
