import { KB_HOST } from '@constants';
import useSWRImmutable from 'swr/immutable';

export const fetcher = (slug) => {
	const lang = window.extSharedData.wpLanguage || null;
	const params = new URLSearchParams({ lang });
	return fetch(`${KB_HOST}/api/posts/${slug}?${params.toString()}`).then(
		(res) => {
			if (res.status === 404) throw new Error('Not found');
			if (!res.ok) throw new Error(res.statusText);
			return res.json();
		},
	);
};

export const useSupportArticle = (slug) => {
	const { data, error } = useSWRImmutable(slug, fetcher);
	return { data, error, loading: !data && !error };
};
