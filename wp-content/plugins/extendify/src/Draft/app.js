import { Draft } from '@draft/Draft';
import { useEditorReady } from '@shared/hooks/gutenberg';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { Flex, FlexBlock } from '@wordpress/components';
import {
	dispatch,
	resolveSelect,
	select,
	subscribe,
	useDispatch,
	useSelect,
} from '@wordpress/data';
import { store as editPostStore } from '@wordpress/edit-post';
import { PluginSidebar, PluginSidebarMoreMenuItem } from '@wordpress/editor';
import { useEffect, useRef } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import '@draft/draft.css';
import { GenerateImageButtons } from '@draft/components/GenerateImageButtons';
import { ToolbarMenu } from '@draft/components/ToolbarMenu';
import { useRouter } from '@draft/hooks/useRouter';
import { magic } from '@draft/svg';

registerPlugin('extendify-draft', {
	render: () => (
		<ExtendifyDraft>
			<PluginSidebarMoreMenuItem target="draft">
				{__('AI Tools', 'extendify-local')}
			</PluginSidebarMoreMenuItem>
			<PluginSidebar
				name="draft"
				icon={magic}
				title={__('AI Tools', 'extendify-local')}
				className="extendify-draft h-full"
			>
				<Flex direction="column" expanded justify="space-between">
					<FlexBlock>
						<Draft />
					</FlexBlock>
				</Flex>
			</PluginSidebar>
		</ExtendifyDraft>
	),
});

const untilRenderingMode = (mode) =>
	new Promise((resolve) => {
		const isMode = () => select('core/editor').getRenderingMode() === mode;
		if (isMode()) return resolve();
		const unsubscribe = subscribe(() => {
			if (!isMode()) return;
			unsubscribe();
			resolve();
		}, 'core/editor');
	});

const nextFrame = () =>
	new Promise((resolve) => requestAnimationFrame(resolve));

// Template-locked drops root inserts, and every mode switch clears the selection.
const addImageBlock = async () => {
	const theme = (await resolveSelect('core').getCurrentTheme())?.stylesheet;
	const isTemplateShown =
		select('core/preferences').get('core', 'renderingModes')?.[theme]?.page ===
		'template-locked';
	const { setRenderingMode } = dispatch('core/editor');

	if (isTemplateShown) {
		// The editor applies the saved mode after mount, undoing any earlier switch.
		await untilRenderingMode('template-locked');
		setRenderingMode('post-only');
		await nextFrame();
	}
	const { getBlocks } = select(blockEditorStore);
	const { insertBlocks, selectBlock } = dispatch(blockEditorStore);
	let imageBlock = getBlocks().find((block) => block.name === 'core/image');
	if (!imageBlock) {
		imageBlock = createBlock('core/image');
		insertBlocks([imageBlock]);
	}
	if (isTemplateShown) {
		setRenderingMode('template-locked');
		await nextFrame();
	}
	selectBlock(imageBlock.clientId);
};

const ExtendifyDraft = ({ children }) => {
	const { navigateTo } = useRouter();
	const { openGeneralSidebar } = useDispatch(editPostStore);
	const sidebarName = useSelect((select) =>
		select(editPostStore).getActiveGeneralSidebarName(),
	);
	const ready = useEditorReady();
	const once = useRef(false);

	useEffect(() => {
		const search = new URLSearchParams(window.location.search);
		// Lets Assist add an image block to highlight the feature
		if (!search.has('ext-add-image-block')) return;
		search.delete('ext-add-image-block');
		window.history.replaceState(
			{},
			'',
			`${window.location.pathname}?${search.toString()}`,
		);

		navigateTo('ai-image');
		addImageBlock().then(() =>
			setTimeout(() => {
				// Focus the textarea but give time for wp to finish it's autofocus
				document.getElementById('draft-ai-image-textarea')?.focus();
			}, 300),
		);
	}, [navigateTo]);

	useEffect(() => {
		if (!ready || once.current) return;

		const id = requestAnimationFrame(() => {
			if (sidebarName === 'extendify-draft/draft') {
				once.current = true;
				return;
			}

			openGeneralSidebar('extendify-draft/draft');
		});

		return () => cancelAnimationFrame(id);
	}, [openGeneralSidebar, sidebarName, ready]);

	return children;
};

// Add the toolbar
addFilter(
	'editor.BlockEdit',
	'extendify-draft/draft-toolbar',
	(CurrentMenuItems) => (props) => ToolbarMenu(CurrentMenuItems, props),
);

// Add the Generate with AI button
addFilter(
	'editor.BlockEdit',
	'extendify-draft/draft-image',
	(CurrentComponents) => (props) =>
		GenerateImageButtons(CurrentComponents, props),
);
