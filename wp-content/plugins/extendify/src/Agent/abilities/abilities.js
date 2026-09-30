import { contentList } from '@agent/abilities/content-list';
import { contentRead } from '@agent/abilities/content-read';
import { contentSearch } from '@agent/abilities/content-search';
import { media } from '@agent/abilities/media';
import { navigation } from '@agent/abilities/navigation';
import { options } from '@agent/abilities/options';
import { siteInfo } from '@agent/abilities/site-info';
import { taxonomies } from '@agent/abilities/taxonomies';
import { themeSettings } from '@agent/abilities/theme-settings';

// Not registered with WordPress — only the descriptor shape is shared.
// Descriptions reach the model, not the screen, and a translated value name breaks the call.
const collection = [
	siteInfo,
	contentList,
	contentSearch,
	contentRead,
	options,
	taxonomies,
	media,
	navigation,
	themeSettings,
];

export const getAbilities = (declared = []) =>
	declared
		.map((entry) =>
			typeof entry === 'string'
				? collection.find((ability) => ability.name === entry)
				: entry,
		)
		.filter(Boolean);

export const abilityDescriptors = (abilities) =>
	abilities.map(({ name, label, description, inputSchema, annotations }) => ({
		name,
		label,
		description,
		inputSchema,
		annotations,
	}));
