// Entries are shaped like the save endpoint's request body so replay is just
// save(entry). Cap protects localStorage size.

import { track } from '@shared/lib/track';
import { __, sprintf } from '@wordpress/i18n';
import {
	save,
	saveProduct,
	saveSiteIdentity,
	saveWpFormsField,
	saveWpNavigationItem,
} from '../lib/api';

const STORAGE_KEY = 'extendify-quick-edit-undo-stack-v1';
const MAX_DEPTH = 5;
const ANNOUNCE_KEY = 'extendify-quick-edit-undo-announce';

const loadStack = () => {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		const arr = raw ? JSON.parse(raw) : [];
		return Array.isArray(arr) ? arr : [];
	} catch (_) {
		return [];
	}
};

const saveStack = (stack) => {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
	} catch (_) {
		// quota / private mode
	}
};

export const pushUndo = (entry) => {
	if (!entry) return;
	const kind = entry.kind || (entry.rawBlock ? 'block' : 'patches');
	const stack = loadStack();
	stack.push({ ...entry, kind, ts: Date.now() });
	while (stack.length > MAX_DEPTH) stack.shift();
	saveStack(stack);
};

const popUndo = () => {
	const stack = loadStack();
	const entry = stack.pop();
	saveStack(stack);
	return entry;
};

export const getStackDepth = () => loadStack().length;

// Returns false on empty stack so callers can show feedback.
export const performUndo = () => {
	const entry = popUndo();
	if (!entry) return false;
	// Site identity lives in wp_options, not post_content; route to its own endpoint.
	let promise;
	if (entry.identityReplay) {
		promise = saveSiteIdentity(entry.beforeValues || {});
	} else if (entry.productReplay) {
		// Routes through WCProductController; price entries carry { regular, sale }.
		promise = saveProduct({
			productId: entry.productId,
			field: entry.field,
			value: entry.beforeValue,
		});
	} else if (entry.navReplay) {
		// Routes through wp-navigation; ref-based nav items live in their own CPT.
		promise = saveWpNavigationItem({
			navPostId: entry.navPostId,
			itemIndex: entry.itemIndex,
			blockType: entry.blockType,
			patches: entry.patches,
		});
	} else if (entry.wpformsReplay) {
		// WPForms fields live in the form's serialized JSON, not post_content;
		// replay through the shallow-merge changes-bag the forward save used.
		promise = saveWpFormsField({
			formId: entry.formId,
			fieldId: entry.fieldId,
			changes: entry.changes,
		});
	} else {
		const { kind: _kind, ts: _ts, ...payload } = entry;
		promise = save(payload);
	}
	promise
		.then(() => {
			track('undo', { kind: entry.kind });
			// aria-live announcement survives the reload via sessionStorage.
			try {
				window.sessionStorage.setItem(
					ANNOUNCE_KEY,
					__('Reverted last change.', 'extendify-local'),
				);
			} catch (_) {
				// quota / private mode
			}
			window.location.reload();
		})
		.catch((err) => {
			track('undo_failed', { kind: entry.kind });
			window.alert(
				sprintf(
					// translators: %s is the underlying error message.
					__('Undo failed: %s', 'extendify-local'),
					err?.message || __('unknown error', 'extendify-local'),
				),
			);
		});
	return true;
};

export const ANNOUNCE_STORAGE_KEY = ANNOUNCE_KEY;
