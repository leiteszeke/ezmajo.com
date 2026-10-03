import { fetchImageCredits } from '@shared/api/DataApi';
import { useImageGenerationStore } from '@shared/state/generate-images';
import { useEffect } from '@wordpress/element';

// The local count is a guess between generations, so ask the server on open.
export const useImageCreditsSync = () => {
	const updateImageCredits = useImageGenerationStore(
		(state) => state.updateImageCredits,
	);

	useEffect(() => {
		fetchImageCredits()
			.then(updateImageCredits)
			// A failed peek leaves the last known count in place.
			.catch(() => {});
	}, [updateImageCredits]);
};
