import { getVibes, vibeCssBySlug } from '@shared/lib/vibes';
import useSWRImmutable from 'swr/immutable';

// Fifteen previews render at once and share this key, so it fetches once.
export const useVibeCss = () =>
	useSWRImmutable('launch-vibe-css', () =>
		getVibes('launch').then(vibeCssBySlug),
	);
