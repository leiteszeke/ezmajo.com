const disabledFields = [
	'short_description',
	'description',
	'sections',
	'tested',
	'requires',
	'rating',
	'ratings',
	'downloaded',
	'downloadlink',
	'last_updated',
	'added',
	'tags',
	'versions',
	'contributors',
	'banners',
	'icons',
	'compatibility',
]
	.map((f) => `request[fields][${f}]=0`)
	.join('&');

export default async ({ query }) => {
	const url = `https://api.wordpress.org/plugins/info/1.2/?action=query_plugins&request[search]=${encodeURIComponent(query)}&request[per_page]=1&${disabledFields}`;

	try {
		const response = await fetch(url);
		if (!response.ok) return { pluginSearchResult: null };

		const data = await response.json();
		const plugin = data?.plugins?.[0];
		if (!plugin?.slug) return { pluginSearchResult: null };

		return {
			pluginSearchResult: { slug: plugin.slug, name: plugin.name },
		};
	} catch {
		return { pluginSearchResult: null };
	}
};
