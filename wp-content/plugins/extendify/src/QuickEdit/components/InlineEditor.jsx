import {
	addCustomMediaViewsCss,
	removeCustomMediaViewsCss,
} from '@shared/lib/media-views';
import { track } from '@shared/lib/track';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { loadProduct, save, saveProduct } from '../lib/api';
import { invalidateBlockSource } from '../lib/block-source-cache';
import { splice } from '../lib/dom';
import { friendlyMessage } from '../lib/errors';
import { closeModal, mountModal } from '../lib/modal-root';
import { useQuickEditStore } from '../state/store';
import { pushUndo } from '../state/undo';
import { BlockTextEditor } from './BlockTextEditor';
import { ErrorPill } from './ErrorPill';
import { AiImagePickerModal } from './modals/AiImagePickerModal';
import { NavItemModal } from './modals/NavItemModal';
import { ProductPriceModal } from './modals/ProductPriceModal';
import { ProductTextModal } from './modals/ProductTextModal';
import { SiteIdentityModal } from './modals/SiteIdentityModal';
import { SocialLinkModal } from './modals/SocialLinkModal';
import { UnsplashImagePickerModal } from './modals/UnsplashImagePickerModal';
import { WPFormsFieldModal } from './modals/WPFormsFieldModal';

// id parsed from the wp-image-N class; null when the image is a raw URL.
const readImageAttrs = (liveEl) => {
	const img =
		liveEl.querySelector('.wp-block-cover__image-background') ||
		liveEl.querySelector('img');
	if (!img) return null;
	const url = img.getAttribute('src') || '';
	const alt = img.getAttribute('alt') || '';
	let id = null;
	for (const cls of img.classList) {
		const m = /^wp-image-(\d+)$/.exec(cls);
		if (m) {
			id = Number(m[1]);
			break;
		}
	}
	return { url, id, alt };
};

const TEXT_STRATEGIES = {
	'core/paragraph': {
		textTarget: (el) => el,
		textField: 'content',
		extras: ['align'],
	},
	'core/heading': {
		textTarget: (el) => el,
		textField: 'content',
		extras: ['align'],
	},
	'core/button': {
		textTarget: (el) => el.querySelector('a'),
		textField: 'text',
		extras: ['url'],
	},
};

const PICKER_STRATEGIES = {
	'core/image': { field: 'image' },
	'core/cover': { field: 'background' },
	'core/media-text:image': { field: 'media' },
	'product:image': { field: 'image' },
};

// Mounted via lib/modal-root so wp-components' Modal portal stays outside
// our prefix scope. Anything single-field or out-of-band (wp_options) goes here.
const MODAL_BLOCK_TYPES = new Set([
	'core/site-title',
	'core/site-tagline',
	'core/site-logo',
	'core/social-link',
	'core/navigation-link',
	'core/navigation-submenu',
	// product:image is omitted — it routes through ImagePicker so it
	// shares the Library/Upload/AI/Unsplash UX with core/image.
	'product:name',
	'product:short_description',
	'product:description',
	'product:price',
	'wpforms:field',
]);

const SITE_IDENTITY_KIND_BY_BLOCK_TYPE = {
	'core/site-title': 'title',
	'core/site-tagline': 'tagline',
	'core/site-logo': 'logo',
};

export const InlineEditor = () => {
	const selected = useQuickEditStore((s) => s.selected);
	const clearSelected = useQuickEditStore((s) => s.clearSelected);

	useEffect(() => {
		if (!selected) return undefined;
		const blockType = selected.blockType;
		if (!MODAL_BLOCK_TYPES.has(blockType)) return undefined;

		// Reload on save so site-identity / nav-label changes propagate
		// to every render of those blocks on the page.
		const onAfterSave = (didSave) => {
			closeModal(false);
			clearSelected();
			if (didSave) window.location.reload();
		};

		let element = null;
		if (SITE_IDENTITY_KIND_BY_BLOCK_TYPE[blockType]) {
			element = (
				<SiteIdentityModal
					kind={SITE_IDENTITY_KIND_BY_BLOCK_TYPE[blockType]}
					onAfterSave={onAfterSave}
				/>
			);
		} else if (blockType === 'core/social-link') {
			element = (
				<SocialLinkModal selected={selected} onAfterSave={onAfterSave} />
			);
		} else if (
			blockType === 'core/navigation-link' ||
			blockType === 'core/navigation-submenu'
		) {
			element = <NavItemModal selected={selected} onAfterSave={onAfterSave} />;
		} else if (
			blockType === 'product:name' ||
			blockType === 'product:short_description' ||
			blockType === 'product:description'
		) {
			element = (
				<ProductTextModal
					productId={selected.productId}
					field={selected.productField}
					onAfterSave={onAfterSave}
				/>
			);
		} else if (blockType === 'product:price') {
			element = (
				<ProductPriceModal
					productId={selected.productId}
					onAfterSave={onAfterSave}
				/>
			);
		} else if (blockType === 'wpforms:field') {
			element = (
				<WPFormsFieldModal
					formId={selected.formId}
					fieldId={selected.fieldId}
					onAfterSave={onAfterSave}
				/>
			);
		}
		if (element) mountModal(element);

		return () => {
			closeModal(false);
		};
	}, [selected, clearSelected]);

	if (!selected) return null;
	if (MODAL_BLOCK_TYPES.has(selected.blockType)) return null;

	if (TEXT_STRATEGIES[selected.blockType]) {
		return <BlockTextEditor selected={selected} />;
	}
	if (PICKER_STRATEGIES[selected.blockType]) {
		// Key on blockId so React remounts the picker — and its
		// `ImagePickerMenu`, which positions itself in `useState(compute)`
		// once at mount — when the user clicks a different image while
		// the menu is open. Without the key the same instance re-renders
		// with the new `selected` prop but keeps its stale `pos` state,
		// leaving the menu visually pinned to the prior image.
		return (
			<ImagePicker
				key={selected.blockId ?? selected.el}
				selected={selected}
				field={PICKER_STRATEGIES[selected.blockType].field}
			/>
		);
	}
	return <UnsupportedNotice blockType={selected.blockType} />;
};

const ImagePicker = ({ selected, field }) => {
	const [error, setError] = useState(null);
	const clearSelected = useQuickEditStore((s) => s.clearSelected);

	useEffect(() => {
		const onDoc = (e) => {
			const menu = document.getElementById('extendify-quick-edit-image-menu');
			if (menu?.contains(e.target)) return;
			// Hover-bar clicks are routed by hover-bar.js' toggle.
			const bar = document.querySelector('.extendify-quick-edit-bar');
			if (bar?.contains(e.target)) return;
			clearSelected();
		};
		const onKey = (e) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				clearSelected();
			}
		};
		// Defer click binding so the click that opened the menu
		// doesn't immediately close it.
		const t = window.setTimeout(() => {
			document.addEventListener('click', onDoc);
		}, 0);
		document.addEventListener('keydown', onKey);
		return () => {
			window.clearTimeout(t);
			document.removeEventListener('click', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	}, [clearSelected]);

	const openFrame = (initialTab) => {
		if (!window.wp?.media) {
			setError(__('Media library is not loaded.', 'extendify-local'));
			return;
		}
		const mode = initialTab === 'upload' ? 'upload' : 'browse';
		track('quick_edit_action', {
			element: selected.blockType,
			type: `image_${mode}`,
		});
		const frame = window.wp.media({
			title:
				mode === 'upload'
					? __('Upload image', 'extendify-local')
					: __('Pick from media library', 'extendify-local'),
			button: { text: __('Use image', 'extendify-local') },
			library: { type: 'image' },
			multiple: false,
		});
		// Tag QE's modal element with mode + uploading classes so our CSS
		// targets ONLY this frame's chrome. Targeting body globally would
		// leak into any other wp.media frame open at the same time — the
		// AI Agent's "Change image" flow uses its own MediaUpload frame,
		// and the agent's media library went blank because the upload-
		// overlay CSS painted a white sheet over every `.media-frame-
		// content`. Modal-scoped classes prevent that.
		frame.on('open', () => {
			const $modal = frame.modal?.$el;
			$modal?.addClass(`extendify-quick-edit-mode-${mode}`);
			if (frame.content?.mode) frame.content.mode(mode);

			// Single-click auto-confirms; wp.media's "Use image" toolbar button
			// is otherwise required. trigger('select') alone leaves the modal
			// open, so close() too. For uploads, wait for the attachment's
			// `uploading` flag to flip and overlay our own spinner so wp.media
			// doesn't flash to the library view mid-upload.
			const selection = frame.state()?.get?.('selection');
			if (selection) {
				selection.on('add', (att) => {
					const commit = () => {
						$modal?.removeClass('extendify-quick-edit-media-uploading');
						frame.state().trigger('select');
						frame.close();
					};
					if (att?.get?.('uploading')) {
						$modal?.addClass('extendify-quick-edit-media-uploading');
						const onChange = () => {
							if (!att.get('uploading')) {
								att.off('change:uploading', onChange);
								commit();
							}
						};
						att.on('change:uploading', onChange);
					} else {
						commit();
					}
				});
			}
		});
		const cleanupModeClass = () => {
			const $modal = frame.modal?.$el;
			$modal?.removeClass(`extendify-quick-edit-mode-${mode}`);
			$modal?.removeClass('extendify-quick-edit-media-uploading');
			removeCustomMediaViewsCss();
		};
		frame.on('close', cleanupModeClass);

		let pickedAndSaving = false;
		frame.on('select', async () => {
			pickedAndSaving = true;
			const att = frame.state().get('selection').first()?.toJSON();
			if (!att) {
				clearSelected();
				return;
			}
			// Product images cascade to many surfaces; reload after save instead of splicing.
			if (selected.source?.kind === 'product') {
				let beforeImageId = 0;
				try {
					const cur = await loadProduct(selected.source.id);
					beforeImageId = Number(cur?.image_id) || 0;
				} catch (_) {
					// non-fatal — undo entry just won't have a before-state.
				}
				try {
					await saveProduct({
						productId: selected.source.id,
						field: 'image',
						value: att.id,
					});
					if (beforeImageId && beforeImageId !== att.id) {
						pushUndo({
							kind: 'product-image',
							productReplay: true,
							productId: selected.source.id,
							field: 'image',
							beforeValue: beforeImageId,
						});
					}
					track('save', { kind: 'product', field: 'image' });
					window.location.reload();
				} catch (err) {
					track('save_failed', { kind: 'product', field: 'image' });
					setError(friendlyMessage(err));
				}
				return;
			}

			const before = readImageAttrs(selected.mediaEl ?? selected.el);
			try {
				const res = await save({
					source: selected.source,
					blockId: selected.blockId,
					blockType: selected.blockName ?? selected.blockType,
					patches: [
						{
							fieldKey: field,
							value: {
								url: att.url,
								id: att.id,
								alt: att.alt || '',
							},
						},
					],
				});
				if (!res.rendered) throw new Error('No rendered HTML');
				const newEl = splice(selected.el, res.rendered);
				if (!newEl) throw new Error('Splice failed');
				invalidateBlockSource(selected.source, selected.blockId);
				if (before) {
					pushUndo({
						kind: 'image',
						source: selected.source,
						blockId: selected.blockId,
						blockType: selected.blockName ?? selected.blockType,
						patches: [{ fieldKey: field, value: before }],
					});
				}
				track('image_replaced', { source: 'wp_media' });
				clearSelected();
			} catch (err) {
				track('save_failed', { kind: 'image', source: 'wp_media' });
				setError(friendlyMessage(err));
			}
		});
		frame.on('close', () => {
			if (!pickedAndSaving) clearSelected();
		});
		// Armor wp.media's chrome before it paints. On the live frontend the
		// site theme's text/heading colors otherwise bleed into the modal —
		// "Upload image", "Drop files to upload", etc. render in the theme's
		// font and color. Mirrors the AI Agent's media flows; the shared
		// helper re-emits wp.media's own CSS with !important. See
		// @shared/lib/media-views.
		addCustomMediaViewsCss();
		frame.open();
	};

	const openImageModal = (Component) => {
		const type =
			Component === AiImagePickerModal ? 'image_ai' : 'image_unsplash';
		track('quick_edit_action', { element: selected.blockType, type });
		const isProduct = selected.source?.kind === 'product';
		const onAfterSave = (didSave) => {
			closeModal(false);
			if (didSave) {
				if (isProduct) {
					window.location.reload();
				} else {
					clearSelected();
				}
			}
		};
		mountModal(
			<Component selected={selected} field={field} onAfterSave={onAfterSave} />,
		);
	};

	if (error) {
		return <ErrorPill message={error} onDismiss={clearSelected} />;
	}

	return (
		<ImagePickerMenu selected={selected}>
			<MenuItem onClick={() => openFrame('browse')}>
				{__('Pick from media library', 'extendify-local')}
			</MenuItem>
			<MenuItem onClick={() => openFrame('upload')}>
				{__('Upload', 'extendify-local')}
			</MenuItem>
			<MenuItem onClick={() => openImageModal(AiImagePickerModal)}>
				{__('Generate with AI', 'extendify-local')}
			</MenuItem>
			<MenuItem onClick={() => openImageModal(UnsplashImagePickerModal)}>
				{__('Search for new image', 'extendify-local')}
			</MenuItem>
		</ImagePickerMenu>
	);
};

// Re-anchor on scroll/resize. The menu always drops from the hover bar — the
// pill the user clicked — which `positionBar` (lib/hover-bar.js) places above
// OR below the image depending on viewport room, and which stays mounted for
// picker blocks. Reading the live bar keeps the menu pinned under the pill
// during scroll: hover-bar.js' own scroll listener is registered first, so it
// repositions the bar before this one reads it. Falls back to the image's top
// edge (where the bar would have sat) if the bar is somehow gone.
const ImagePickerMenu = ({ selected, children }) => {
	const menuRef = useRef(null);
	const compute = () => {
		const bar = document
			.querySelector('.extendify-quick-edit-bar')
			?.getBoundingClientRect();
		// Anchor to the media figure for media-text so the menu lands over the
		// image, not the whole block (which spans the text side too).
		const image =
			(selected.mediaEl ?? selected.el)?.getBoundingClientRect?.() ??
			selected.anchorRect ??
			null;
		const anchor = bar ?? image;
		if (!anchor) return { top: 0, left: 0 };
		const MENU_W = 220;
		const MENU_H = 180;
		const GAP = 6;
		// Center on the pill (itself centered on the picked element). Left-
		// aligning to the element's left edge dropped the menu into dead space
		// when the picked element was a viewport-wide cover (`anchor.left ≈ 0`).
		let left = anchor.left + (anchor.width - MENU_W) / 2;
		if (left + MENU_W > window.innerWidth - 4) {
			left = window.innerWidth - MENU_W - 4;
		}
		if (left < 4) left = 4;
		// Drop below the pill; flip above it when there isn't room below.
		let top = bar ? bar.bottom + GAP : image.top;
		if (top + MENU_H > window.innerHeight - 4) {
			top = Math.max(4, (bar ? bar.top : image.bottom) - MENU_H - GAP);
		}
		if (top < 4) top = 4;
		return { top, left };
	};
	const [pos, setPos] = useState(compute);
	useEffect(() => {
		const handler = () => setPos(compute());
		window.addEventListener('scroll', handler, {
			capture: true,
			passive: true,
		});
		window.addEventListener('resize', handler);
		return () => {
			window.removeEventListener('scroll', handler, { capture: true });
			window.removeEventListener('resize', handler);
		};
	}, [selected.el]);

	// Standard menu pattern: focus the first item on open. The menu renders
	// at the end of <body>, so Tab alone never reaches it — without this,
	// keyboard users can't operate the picker at all.
	useEffect(() => {
		menuRef.current
			?.querySelector('[role="menuitem"]')
			?.focus({ preventScroll: true });
	}, []);

	const onKeyDown = (e) => {
		if (e.key === 'Escape') {
			// Restore focus to the picked block before the document-level
			// escape handler (global-escape.js) clears the selection and
			// unmounts this menu. Running here — a React handler on the
			// quick-edit root — beats those document listeners to it.
			selected.el?.focus?.({ preventScroll: true });
			return;
		}
		if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
		const items = [
			...(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? []),
		];
		if (!items.length) return;
		e.preventDefault();
		const cur = items.indexOf(document.activeElement);
		const last = items.length - 1;
		let next;
		if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = last;
		else if (e.key === 'ArrowDown') next = cur < last ? cur + 1 : 0;
		else next = cur > 0 ? cur - 1 : last;
		items[next]?.focus({ preventScroll: true });
	};

	return (
		<div
			id="extendify-quick-edit-image-menu"
			role="menu"
			ref={menuRef}
			className="extendify-quick-edit-image-menu fixed z-high flex min-w-[220px] flex-col gap-[2px] rounded-[12px] bg-white p-[6px] font-qe shadow-[0_12px_28px_-8px_rgba(15,23,42,0.25),0_0_0_1px_rgba(15,23,42,0.05)]"
			style={pos}
			onKeyDown={onKeyDown}
		>
			{children}
		</div>
	);
};

const MenuItem = ({ onClick, children }) => (
	<button
		type="button"
		role="menuitem"
		className="flex w-full cursor-pointer items-center justify-start rounded-[8px] border-0 bg-transparent px-[12px] py-[10px] text-left text-[13px] font-medium leading-[1.4] text-gray-900 transition-[background] duration-[120ms] hover:bg-gray-100 focus-visible:outline-offset-[-2px] focus-visible:[outline:2px_solid_var(--color-design-main)]"
		onMouseDown={(e) => e.preventDefault()}
		onClick={onClick}
	>
		{children}
	</button>
);

const UnsupportedNotice = ({ blockType }) => {
	const clearSelected = useQuickEditStore((s) => s.clearSelected);
	return (
		<ErrorPill
			message={`${__('No editor for this block type yet.', 'extendify-local')} (${blockType})`}
			onDismiss={clearSelected}
		/>
	);
};
