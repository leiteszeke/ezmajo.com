import changeHeroSection from '@agent/workflows/theme/tools/change-hero-section';
import updatePalette from '@agent/workflows/theme/tools/update-palette';
import updateSiteVibes from '@agent/workflows/theme/tools/update-site-vibes';
import updateVariation from '@agent/workflows/theme/tools/update-variation';

export default async ({
	updatedPageBlocks,
	postId,
	vibeSlug,
	colorAndFontsVariation,
	colorPalette,
}) => {
	if (!updatedPageBlocks || !vibeSlug || !colorAndFontsVariation) return;

	await Promise.all([
		changeHeroSection({ updatedPageBlocks, postId }),
		(async () => {
			// The vibe write goes last so it owns the contested leaves.
			await updateVariation({ variation: colorAndFontsVariation });
			// Absent or failing when /api/palettes is down; the vibe write must still run.
			if (colorPalette) await updatePalette({ colorPalette }).catch(() => null);
			await updateSiteVibes({ selectedVibe: vibeSlug });
		})(),
	]);
};
