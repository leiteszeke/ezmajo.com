import {
	CHOICE_PAGES,
	DESCRIPTION_PAGES,
	MODAL_PAGES,
	PROGRESS_PAGES,
} from './index';
import {
	choiceManifests,
	descriptionManifests,
	modalManifests,
	progressManifests,
} from './manifests';

/**
 * Every layout a screen can draw, paired with the manifest describing it.
 *
 * Nothing in the flow reads this: the flow draws one layout and asks `index`
 * for it. Importing it here would pull all 15 manifests into the bundle.
 */
const entriesFrom = (pages) => (manifest) => {
	const id = manifest.$id.split('/').pop();
	return { id, label: manifest.title, Page: pages[id] };
};

export const descriptionTemplates = () =>
	descriptionManifests().map(entriesFrom(DESCRIPTION_PAGES));

export const progressTemplates = () =>
	progressManifests().map(entriesFrom(PROGRESS_PAGES));

export const choiceTemplates = () =>
	choiceManifests().map(entriesFrom(CHOICE_PAGES));

export const modalTemplates = () =>
	modalManifests().map(entriesFrom(MODAL_PAGES));
