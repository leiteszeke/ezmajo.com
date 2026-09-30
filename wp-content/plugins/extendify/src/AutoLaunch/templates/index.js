import { Page as Centered } from './centered/Page';
import { Page as Choice } from './choice/Page';
import { Page as Modal } from './modal/Page';
import { Page as Split } from './split/Page';
import { Page as Stacked } from './stacked/Page';

/**
 * A template arranges the page; it never builds its parts. The flow passes them
 * in already wired, so no template can drop the required-plugin pre-install, an
 * A/B assignment or the submit flow by omitting a slot.
 *
 * One registry per screen: a template built for one renders blank in the other.
 */
export const DESCRIPTION_PAGES = { centered: Centered, split: Split };
export const PROGRESS_PAGES = { stacked: Stacked };
export const CHOICE_PAGES = { choice: Choice };
export const MODAL_PAGES = { modal: Modal };

// Which layout ships when a design names none. Change these to ship another.
export const ACTIVE_DESCRIPTION_TEMPLATE = 'centered';
export const ACTIVE_PROGRESS_TEMPLATE = 'stacked';
export const ACTIVE_CHOICE_TEMPLATE = 'choice';
export const ACTIVE_MODAL_TEMPLATE = 'modal';

let chosen = {};

// An unknown layout falls back to the shipped one, or an old install draws blank.
export const chooseTemplates = (templates) => {
	chosen = templates ?? {};
};

const pageFor = (pages, name, shipped, fallback) =>
	pages[chosen[name]] ?? pages[shipped] ?? fallback;

export const activeDescriptionTemplate = () =>
	pageFor(
		DESCRIPTION_PAGES,
		'description',
		ACTIVE_DESCRIPTION_TEMPLATE,
		Centered,
	);

export const activeProgressTemplate = () =>
	pageFor(PROGRESS_PAGES, 'progress', ACTIVE_PROGRESS_TEMPLATE, Stacked);

export const activeChoiceTemplate = () =>
	pageFor(CHOICE_PAGES, 'choice', ACTIVE_CHOICE_TEMPLATE, Choice);

export const activeModalTemplate = () =>
	pageFor(MODAL_PAGES, 'modal', ACTIVE_MODAL_TEMPLATE, Modal);
