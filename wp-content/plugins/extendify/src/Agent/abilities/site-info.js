import apiFetch from '@wordpress/api-fetch';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';

const paths = {
	settings: '/wp/v2/settings?context=edit',
	themes: '/wp/v2/themes?status=active',
	plugins: '/wp/v2/plugins',
};

const facts = {
	title: { from: 'settings', read: (settings) => settings.title },
	tagline: { from: 'settings', read: (settings) => settings.description },
	url: { from: 'settings', read: (settings) => settings.url },
	language: { from: 'settings', read: (settings) => settings.language },
	timezone: { from: 'settings', read: (settings) => settings.timezone },
	frontPage: {
		from: 'settings',
		read: (settings) =>
			settings.show_on_front === 'page'
				? { shows: 'page', pageId: settings.page_on_front }
				: { shows: 'posts' },
	},
	theme: {
		from: 'themes',
		read: (themes) => decodeEntities(themes[0]?.name?.rendered ?? ''),
	},
	plugins: {
		from: 'plugins',
		read: (plugins) =>
			plugins.map(({ name, status }) => ({
				name: decodeEntities(name),
				status,
			})),
	},
	wpVersion: { read: () => window.extSharedData.wpVersion },
};

export const siteInfo = {
	name: 'extendify/site-info',
	label: __('Site details', 'extendify-local'),
	description:
		'What this WordPress site is: its title, tagline, address, language, timezone, active theme, installed plugins, WordPress version, and what its front page shows.',
	inputSchema: {
		type: 'object',
		properties: {
			include: {
				type: 'array',
				items: { type: 'string', enum: Object.keys(facts) },
				description: 'Which of these to return. Omit it for all of them.',
			},
		},
	},
	annotations: { readonly: true },
	execute: async ({ include } = {}) => {
		const wanted = include?.length
			? include.filter((key) => facts[key])
			: Object.keys(facts);
		const sources = [
			...new Set(wanted.map((key) => facts[key].from).filter(Boolean)),
		];
		const read = Object.fromEntries(
			await Promise.all(
				sources.map(async (source) => [
					source,
					await apiFetch({ path: paths[source] }),
				]),
			),
		);

		return Object.fromEntries(
			wanted.map((key) => [key, facts[key].read(read[facts[key].from])]),
		);
	},
};
