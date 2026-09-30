import { generateImage } from '@shared/api/DataApi';
import { downloadImage } from '@shared/api/wp';
import {
	DEFAULT_IMAGE_SEARCH,
	resolveImageSearch,
} from '@shared/lib/image-search-defaults';
import { fetchImages } from '@shared/lib/unsplash';
import { useImageGenerationStore } from '@shared/state/generate-images';
import { useUnsplashCacheStore } from '@shared/state/unsplash-cache';
import { useCallback, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import useSWRImmutable from 'swr/immutable';

const SIZES = [
	['1024x1024', 1],
	['1536x1024', 3 / 2],
	['1024x1536', 2 / 3],
	['1792x1024', 16 / 9],
	['1024x1792', 9 / 16],
];

// The model renders one of five ratios; the wrong one gets cropped by
// object-cover, and 2k costs seconds a slot this size can't show.
export const targetFor = (el) => {
	const { width, height } = el?.getBoundingClientRect?.() ?? {};
	if (!width || !height) return {};
	const ratio = width / height;
	const [size] = SIZES.reduce((best, entry) =>
		Math.abs(entry[1] - ratio) < Math.abs(best[1] - ratio) ? entry : best,
	);
	return { size, quality: width > 1024 ? 'medium' : 'low' };
};

// onUrlReady is awaited so surfaces can preload/preview before an url turns ready.
export const useImageAcquisition = ({ source, onUrlReady } = {}) => {
	const [states, setStates] = useState({});
	const { imageCredits, updateImageCredits, subtractOneCredit } =
		useImageGenerationStore();
	const statesRef = useRef(states);
	statesRef.current = states;
	const onUrlReadyRef = useRef(onUrlReady);
	onUrlReadyRef.current = onUrlReady;

	const setItemState = useCallback(
		(key, state) => setStates((states) => ({ ...states, [key]: state })),
		[],
	);

	const generate = useCallback(
		async (key, prompt, target = {}) => {
			if (
				Number(useImageGenerationStore.getState().imageCredits.remaining) === 0
			) {
				setItemState(key, {
					status: 'error',
					message: __(
						"You've run out of daily image credits.",
						'extendify-local',
					),
				});
				return;
			}
			setItemState(key, { status: 'generating' });
			subtractOneCredit();
			try {
				const {
					imageCredits: credits,
					images,
					id,
				} = await generateImage({
					prompt,
					source,
					quality: 'low',
					...target,
				});
				updateImageCredits(credits);
				const url = images?.[0]?.url;
				if (!url) throw new Error(__('No image returned', 'extendify-local'));
				await onUrlReadyRef.current?.(key, url);
				setItemState(key, {
					status: 'ready',
					url,
					alt: images[0].alt ?? prompt,
					requestId: id ?? null,
				});
			} catch (error) {
				if (error?.imageCredits) updateImageCredits(error.imageCredits);
				setItemState(key, {
					status: 'error',
					message:
						error?.message ||
						__('An unknown error occurred.', 'extendify-local'),
				});
			}
		},
		[setItemState, subtractOneCredit, updateImageCredits, source],
	);

	const attachImage = useCallback(
		(key, image) => setItemState(key, { status: 'ready', image }),
		[setItemState],
	);

	const pickUnsplash = useCallback(
		async (key, photo) => {
			const url = photo?.urls?.regular;
			if (!url) return;
			try {
				await onUrlReadyRef.current?.(key, url);
			} catch (error) {
				setItemState(key, {
					status: 'error',
					message:
						error?.message ||
						__('An unknown error occurred.', 'extendify-local'),
				});
				return;
			}
			setItemState(key, {
				status: 'ready',
				url,
				photoId: photo.id,
				requestId: photo.requestMetadata?.id ?? null,
			});
		},
		[setItemState],
	);

	const markAwaiting = useCallback(
		(key) => setItemState(key, { status: 'awaiting' }),
		[setItemState],
	);

	// Media picks are already attachments; generated/Unsplash urls are off-site until imported.
	const resolveImage = useCallback(async (key, { disclose = false } = {}) => {
		const state = statesRef.current[key];
		if (state?.image) return state.image;
		if (!state?.url) return null;
		if (state.photoId) {
			return await downloadImage(
				state.requestId,
				state.url,
				'unsplash',
				state.photoId,
			);
		}
		return await downloadImage(
			state.requestId,
			state.url,
			'ai-generated',
			null,
			{
				alt: state.alt,
				disclose,
			},
		);
	}, []);

	return {
		states,
		imageCredits,
		generate,
		attachImage,
		pickUnsplash,
		markAwaiting,
		resolveImage,
	};
};

const searchImages = async (search, source) => {
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

export const useUnsplashSearch = (search, source = null) => {
	const key = search || DEFAULT_IMAGE_SEARCH;
	const { data, error } = useSWRImmutable(key, () => searchImages(key, source));
	return { data, error, loading: !data && !error };
};
