import { vibeGlobalsEntry } from '@shared/lib/vibe-globals';
import { getVibes, vibesBySlug } from '@shared/lib/vibes';

// Widening to the served set purges leaves this vibe never declared.
export const appliedVibeOwnership = async (vibe) => {
	const selected = vibe || 'natural-1';

	try {
		const payloads = await getVibes(`agent,${selected}`);
		const entry = vibeGlobalsEntry(vibesBySlug(payloads), selected);
		return entry ? { [selected]: entry } : {};
	} catch {
		return {};
	}
};
