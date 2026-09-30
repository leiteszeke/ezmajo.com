import { waitUntilExists, waitUntilGone } from '@help-center/lib/tour-helpers';
import { hasPageCreatorEnabled } from '@help-center/lib/utils';
import { createBlock } from '@wordpress/blocks';
import { __, isRTL } from '@wordpress/i18n';

const hasIframe = () =>
	!!document.querySelector('iframe[name="editor-canvas"]');
const disableKeyboard = (e) => e.keyCode !== 13 ?? e.preventDefault();
const inserterButtonSelector = (extraState = '') =>
	`.edit-post-header-toolbar__inserter-toggle${extraState}, .editor-document-tools__inserter-toggle${extraState}`;

export default {
	id: 'page-editor-tour',
	title: __('Page editor', 'extendify-local'),
	settings: {
		allowOverflow: true,
		startFrom: [
			hasPageCreatorEnabled
				? `${window.extSharedData.adminUrl}post-new.php?post_type=page&ext-page-creator-close=1`
				: `${window.extSharedData.adminUrl}post-new.php?post_type=page&ext-close=1`,
			`${window.extSharedData.adminUrl}post-new.php?post_type=page`,
		],
	},
	steps: [
		{
			title: __('Add a Block', 'extendify-local'),
			text: __('Click the plus to open the block inserter.', 'extendify-local'),
			attachTo: {
				element: inserterButtonSelector(),
				offset: {
					marginTop: 15,
					marginLeft: 0,
				},
				position: {
					x: isRTL() ? 'right' : 'left',
					y: 'bottom',
				},
				hook: isRTL() ? 'top right' : 'top left',
			},
			events: {
				beforeAttach: async () => {
					return await waitUntilExists(inserterButtonSelector());
				},
			},
		},
		{
			title: __('Block Inserter', 'extendify-local'),
			text: __(
				'Add a block by clicking or dragging it onto the page.',
				'extendify-local',
			),
			attachTo: {
				element: '.block-editor-inserter__menu',
				offset: {
					marginTop: 0,
					marginLeft: isRTL() ? -15 : 15,
				},
				position: {
					x: isRTL() ? 'left' : 'right',
					y: 'top',
				},
				hook: isRTL() ? 'top right' : 'top left',
			},
			events: {
				beforeAttach: async () => {
					document
						.querySelector(inserterButtonSelector(':not(.is-pressed)'))
						?.click();

					return await waitUntilExists('.block-editor-tabbed-sidebar');
				},
				onAttach: () => {
					const toggle = document.querySelector(inserterButtonSelector());
					onMutate.observe(toggle, { attributes: true });
					window.addEventListener('keydown', disableKeyboard);
				},
				onDetach: async () => {
					onMutate.disconnect();
					window.removeEventListener('keydown', disableKeyboard);
					document
						.querySelector(inserterButtonSelector('.is-pressed'))
						?.click();
					await waitUntilGone('.block-editor-inserter__block-list');
					requestAnimationFrame(() => {
						document.getElementById('help-center-tour-next-button')?.focus();
					});
				},
			},
		},
		{
			title: __('Page Title', 'extendify-local'),
			text: __(
				'Edit the page title by clicking it. Note: The title may or may not show up on the published page, depending on the page template used.',
				'extendify-local',
			),
			attachTo: {
				element: () =>
					hasIframe() ? 'iframe[name="editor-canvas"]' : '.wp-block-post-title',
				offset: () => ({
					marginTop: hasIframe() ? 15 : 0,
					marginLeft: isRTL()
						? hasIframe()
							? 15
							: -15
						: hasIframe()
							? -15
							: 15,
				}),
				position: {
					x: isRTL() ? 'left' : 'right',
					y: 'top',
				},
				hook: () =>
					isRTL()
						? hasIframe()
							? 'top left'
							: 'top right'
						: hasIframe()
							? 'top right'
							: 'top left',
			},
			events: {
				beforeAttach: async () => {
					await window.wp.data
						.dispatch('core/editor')
						.editPost({ title: 'Sample Post' });
				},
			},
		},
		{
			title: __('Blocks', 'extendify-local'),
			text: __(
				'Each block will show up on the page and can be edited by clicking on it.',
				'extendify-local',
			),
			attachTo: {
				element: () =>
					hasIframe()
						? 'iframe[name="editor-canvas"]'
						: '.wp-block-post-content > p',
				offset: () => ({
					marginTop: hasIframe() ? 15 : 0,
					marginLeft: isRTL()
						? hasIframe()
							? 15
							: -15
						: hasIframe()
							? -15
							: 15,
				}),
				position: {
					x: isRTL() ? 'left' : 'right',
					y: 'top',
				},
				hook: () =>
					isRTL()
						? hasIframe()
							? 'top left'
							: 'top right'
						: hasIframe()
							? 'top right'
							: 'top left',
			},
			events: {
				beforeAttach: async () => {
					// get block count
					const blockCount = await window.wp.data
						.select('core/block-editor')
						.getBlockCount();
					if (blockCount > 0) return;
					// create a block and insert it
					const block = createBlock('core/paragraph', {
						content: __(
							"This is a sample paragraph block. It can be several sentences long and will span multiple rows. You can add as many blocks as you'd like to the page.",
							'extendify-local',
						),
					});
					await window.wp.data.dispatch('core/block-editor').insertBlock(block);
					return hasIframe()
						? await window.wp.data
								.dispatch('core/block-editor')
								.flashBlock(block.clientId)
						: null;
				},
			},
		},
		{
			title: __('Page and Block Settings', 'extendify-local'),
			text: __(
				'Select either page or block to change the settings for the entire page or the block that is selected.',
				'extendify-local',
			),
			attachTo: {
				element: '.interface-interface-skeleton__sidebar',
				offset: {
					marginTop: 0,
					marginLeft: isRTL() ? 15 : -15,
				},
				position: {
					x: isRTL() ? 'right' : 'left',
					y: 'top',
				},
				hook: isRTL() ? 'top left' : 'top right',
			},
			events: {
				beforeAttach: async () => {
					const settingsButton = document.querySelector(
						`[aria-label="${__('Settings')}"]:not(.is-pressed)`,
					);
					if (settingsButton) {
						settingsButton?.click();
					} else {
						document
							.querySelector('[aria-label="Settings"]:not(.is-pressed)')
							?.click();
					}

					await waitUntilExists('.interface-interface-skeleton__sidebar');
					document
						.querySelector(
							'.edit-post-sidebar__panel-tab,[data-tab-id="edit-post/document"]',
						)
						?.click();

					await waitUntilExists('.editor-post-status');
					document.querySelector('.edit-post-post-status button')?.click();
				},
			},
		},
		{
			title: __('Preview', 'extendify-local'),
			text: __(
				'Click preview to view how your changes look on the front end of your site.',
				'extendify-local',
			),
			attachTo: {
				element:
					'.block-editor-post-preview__button-toggle,.editor-preview-dropdown__toggle',
				offset: {
					marginTop: 0,
					marginLeft: isRTL() ? 15 : -15,
				},
				position: {
					x: isRTL() ? 'right' : 'left',
					y: 'top',
				},
				hook: isRTL() ? 'top left' : 'top right',
			},
			events: {},
		},
		{
			title: __('Publish or Save', 'extendify-local'),
			text: __(
				'Click publish or update to save the changes you have made to the page and make them live on the site.',
				'extendify-local',
			),
			attachTo: {
				element: '.editor-post-publish-button__button',
				offset: {
					marginTop: 15,
				},
				position: {
					x: isRTL() ? 'left' : 'right',
					y: 'bottom',
				},
				hook: isRTL() ? 'top left' : 'top right',
			},
			events: {},
		},
	],
};

const onMutate = new MutationObserver(() => {
	document.querySelector(inserterButtonSelector(':not(.is-pressed)'))?.click();
});
