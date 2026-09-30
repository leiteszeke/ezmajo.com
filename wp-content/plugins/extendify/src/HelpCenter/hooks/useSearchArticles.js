import { KB_HOST } from '@constants';
import useSWRImmutable from 'swr/immutable';

export const fetcher = async (search) => {
	if (search.length < 3) return null;
	const urlParams = new URLSearchParams({
		lang: window.extSharedData.wpLanguage || null,
		search,
	});
	return await fetch(`${KB_HOST}/api/posts?${urlParams.toString()}`, {
		method: 'POST',
	}).then((res) => {
		if (!res.ok) throw new Error(res.statusText);
		return res.json();
	});
};

export const useSearchArticles = (search) => {
	const { data, error } = useSWRImmutable(search || null, fetcher);
	return { data, error, loading: !data && !error };
};
