import {
	DEFAULT_IMAGE_SEARCH,
	resolveImageSearch,
} from '@shared/lib/image-search-defaults';
import { fetchImages } from '@shared/lib/unsplash';
import { useUnsplashCacheStore } from '@shared/state/unsplash-cache';
import useSWRImmutable from 'swr/immutable';

const searchImages = async (search, source = null) => {
	const cache = useUnsplashCacheStore.getState();
	if (
		search === DEFAULT_IMAGE_SEARCH &&
		!cache.isEmpty() &&
		!cache.hasExpired()
	) {
		return cache.images;
	}
	return await fetchImages(resolveImageSearch(search), source);
};

export const useUnsplashImages = (search, source = null) => {
	const key = search || DEFAULT_IMAGE_SEARCH;
	const { data, error } = useSWRImmutable(key, () => searchImages(key, source));
	return { data, error, loading: !data && !error };
};
