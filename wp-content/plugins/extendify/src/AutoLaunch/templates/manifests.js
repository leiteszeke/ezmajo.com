import centered from './centered/manifest.json';
import choice from './choice/manifest.json';
import { globalManifests } from './global';
import modal from './modal/manifest.json';
import choicePage from './pages/choice.json';
import description from './pages/description.json';
import modalPage from './pages/modal.json';
import progress from './pages/progress.json';
import { idOf, mergeManifests } from './schema';
import split from './split/manifest.json';
import stacked from './stacked/manifest.json';

/**
 * Properties live in JSON beside their page so a tool outside the plugin reads
 * the same file the plugin does, rather than a second copy that drifts.
 *
 * Labels sit there untranslated on purpose: nothing in the flow renders them,
 * and a string in JSON cannot reach make-pot anyway.
 */
export const descriptionManifests = () => [centered, split];

export const progressManifests = () => [stacked];

export const choiceManifests = () => [choice];

export const modalManifests = () => [modal];

const everyTemplate = () => [
	...descriptionManifests(),
	...progressManifests(),
	...choiceManifests(),
	...modalManifests(),
];

const PAGE_OF = {
	centered: 'description',
	split: 'description',
	stacked: 'progress',
	choice: 'choice',
	modal: 'modal',
};

export const pageManifests = () => [
	description,
	progress,
	choicePage,
	modalPage,
];

const pageManifest = (page) =>
	pageManifests().find((entry) => idOf(entry) === page);

/**
 * Global, then the page, then the template. Nothing reads this at runtime — a
 * page reads its variables from the cascade — so it exists for a tool that has
 * to know what it may set, and for the contract test over the three levels.
 */
export const resolvedFor = (template) => {
	const page = pageManifest(PAGE_OF[template]);
	const own = everyTemplate().find((entry) => idOf(entry) === template);
	return mergeManifests([
		...globalManifests(),
		...(page ? [page] : []),
		...(own ? [own] : []),
	]);
};
