import { KB_HOST } from '@constants';

export default async ({ query }) => {
	const fallback = { documentation: 'No relevant documentation found' };
	const urlParams = new URLSearchParams({ search: query });
	const r = await fetch(`${KB_HOST}/api/posts?${urlParams.toString()}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
	}).catch(() => ({ ok: false }));
	if (!r.ok) return fallback;

	const articles = await r.json();
	if (!articles?.[0]?.slug) return fallback;
	const r2 = await fetch(`${KB_HOST}/api/posts/${articles?.[0]?.slug}`, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' },
	}).catch(() => ({ ok: false }));
	if (!r2.ok) return fallback;
	const article = await r2.json();
	return article?.content ? { documentation: article.content } : fallback;
};
