import { useContentHighlight } from '@draft/hooks/useContentHighlight';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createBlock, pasteHandler } from '@wordpress/blocks';
import {
	__experimentalDivider as Divider,
	MenuGroup,
	MenuItem,
} from '@wordpress/components';
import { dispatch, select, useDispatch, useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { __, isRTL } from '@wordpress/i18n';
import {
	addSubmenu,
	Icon,
	insertAfter,
	replace,
	rotateLeft,
	trash,
} from '@wordpress/icons';

export const InsertMenu = ({
	prompt,
	completion,
	loading,
	setPrompt,
	setInputText,
}) => {
	const { toggleHighlight, toggleInsertionPoint } = useContentHighlight();
	const { insertBlocks, replaceBlocks } = useDispatch(blockEditorStore);
	const {
		getSelectedBlock,
		getSelectedBlockClientIds,
		getBlockRootClientId,
		getBlockIndex,
		getBlock,
	} = useSelect((select) => select(blockEditorStore), []);
	const selectedBlock = getSelectedBlock();
	const selectedBlockIds = getSelectedBlockClientIds();

	const canReplaceContent = () => {
		const firstBlock = selectedBlock
			? selectedBlock
			: getBlock(selectedBlockIds[0]);
		if (!firstBlock) return false;
		// If it's a header or a p, we can replace the content
		// TODO: support more?
		const unsupported = ['core/list-item', 'core/button'];
		if (unsupported.includes(firstBlock?.name)) {
			// Can we support the same block?
			const blocks = plainTextToBlocks(completion);
			return blocks[0]?.name === firstBlock?.name;
		}
		return true;
	};

	const canInsertAfter = () => {
		const firstBlock = selectedBlock
			? selectedBlock
			: getBlock(selectedBlockIds[0]);
		if (!firstBlock) return true;
		// TODO: more? or should we go up to the parent?
		const unsupported = ['core/list-item', 'core/button'];
		return !unsupported.includes(firstBlock?.name);
	};

	const plainTextToBlocks = (plainText) => {
		const blocks = pasteHandler({ plainText: plainText });
		if (!Array.isArray(blocks)) {
			return [createBlock('core/paragraph', { content: blocks })];
		}
		return blocks;
	};

	const insertCompletion = async ({ replaceContent = false, position }) => {
		setPrompt({ text: '', promptType: '', systemMessageKey: '' });

		const targetBlockId = selectedBlock
			? selectedBlock?.clientId
			: selectedBlockIds[0];
		const targetBlock = getBlock(targetBlockId);

		const renderingModes =
			select('core/preferences').get('core', 'renderingModes') || {};
		const currentTheme = select('core').getCurrentTheme()?.stylesheet;
		const isTemplateShown =
			renderingModes?.[currentTheme]?.page === 'template-locked';

		const { set: setPreference } = dispatch('core/preferences');
		const setRenderingMode = (mode) =>
			setPreference('core', 'renderingModes', {
				...renderingModes,
				[currentTheme]: { ...(renderingModes[currentTheme] || {}), page: mode },
			});

		const blocks = plainTextToBlocks(completion);
		try {
			if (!targetBlockId || position === 'end') {
				if (isTemplateShown) {
					setRenderingMode('post-only');
					await new Promise((resolve) => requestAnimationFrame(resolve));
				}

				insertBlocks(blocks);
				return;
			}

			if (position === 'top') {
				if (isTemplateShown) {
					setRenderingMode('post-only');
					await new Promise((resolve) => requestAnimationFrame(resolve));
				}

				insertBlocks(blocks, 0);
				return;
			}
		} finally {
			if (isTemplateShown) setRenderingMode('template-locked');
		}

		const targetIsEmpty = targetBlock?.attributes?.content === '';
		const parentBlockId = getBlockRootClientId(targetBlockId);
		const blockIndex = getBlockIndex(selectedBlockIds.at(-1), parentBlockId);
		if (!replaceContent && !targetIsEmpty) {
			// Multiple blocks are selected, insert after
			insertBlocks(blocks, blockIndex + 1, parentBlockId);
			return;
		}

		const bothHaveContent = (one, two) =>
			Object.hasOwn(one?.attributes, 'content') &&
			Object.hasOwn(two?.attributes, 'content');
		// If both have content, and it's only one block, they can be merged
		const mergeable =
			blocks.length === 1 && bothHaveContent(targetBlock, blocks[0]);

		// Apply formatting to all the blocks
		const formattedBlocks = blocks.map((incomingBlock) => ({
			...incomingBlock,
			name: mergeable ? targetBlock.name : incomingBlock.name,
			attributes: {
				...targetBlock.attributes,
				content:
					// If they both have content, they can merge and give it to the incoing block
					// otherwise just default to the existing block content
					bothHaveContent(incomingBlock, targetBlock)
						? incomingBlock?.attributes?.content
						: incomingBlock?.attributes?.content,
			},
		}));

		// TODO: some blocks are harder to replace, like list items
		// Should we climb up to the parent in this case?
		// See notes in canReplaceContent() above
		replaceBlocks(selectedBlockIds, formattedBlocks);
	};

	const discard = () => {
		setInputText('');
		setPrompt({ text: '', promptType: '', systemMessageKey: '' });
	};

	const retry = () => {
		setInputText('');
		setPrompt({ text: '', promptType: '', systemMessageKey: '' });
		setTimeout(() => setPrompt(prompt));
	};

	useEffect(() => {
		return () => {
			toggleHighlight(selectedBlockIds, { isHighlighted: false });
		};
	}, [selectedBlockIds, toggleHighlight]);

	return (
		<MenuGroup>
			<MenuItem
				onClick={() => insertCompletion({ replaceContent: true })}
				onMouseEnter={() =>
					toggleHighlight(selectedBlockIds, {
						isHighlighted: true,
					})
				}
				onMouseLeave={() =>
					toggleHighlight(selectedBlockIds, {
						isHighlighted: false,
					})
				}
				disabled={loading || !canReplaceContent()}
				icon={replace}
				iconPosition="left"
				data-test="replace-selected"
				className="h-auto min-h-10 items-start"
			>
				<span className="whitespace-normal break-words text-start">
					{__('Replace selected block text', 'extendify-local')}
				</span>
			</MenuItem>
			<MenuItem
				onClick={() =>
					insertCompletion({ replaceContent: false, position: 'top' })
				}
				disabled={loading}
				iconPosition="left"
				data-test="insert-top"
				className="h-auto min-h-10 items-start"
			>
				<div className={isRTL() ? '-mr-1' : '-ml-1'}>
					<Icon icon={addSubmenu} className="rotate-180" />
				</div>
				<div className="whitespace-normal break-words px-1 text-start">
					{__('Insert at top', 'extendify-local')}
				</div>
			</MenuItem>
			<MenuItem
				onClick={() => insertCompletion({ replaceContent: false })}
				onMouseEnter={() => toggleInsertionPoint(true)}
				onMouseLeave={() => toggleInsertionPoint(false)}
				disabled={loading || !canInsertAfter()}
				icon={insertAfter}
				iconPosition="left"
				data-test="insert-after"
				className="h-auto min-h-10 items-start"
			>
				<span className="whitespace-normal break-words text-start">
					{__('Insert after the selected text', 'extendify-local')}
				</span>
			</MenuItem>
			<MenuItem
				onClick={() =>
					insertCompletion({ replaceContent: false, position: 'end' })
				}
				disabled={loading}
				icon={addSubmenu}
				iconPosition="left"
				data-test="insert-bottom"
			>
				{__('Insert at bottom', 'extendify-local')}
			</MenuItem>
			<Divider />
			<MenuItem
				onClick={retry}
				disabled={loading}
				icon={rotateLeft}
				iconPosition="left"
				data-test="try-again-button"
			>
				{__('Try again', 'extendify-local')}
			</MenuItem>
			<MenuItem
				onClick={discard}
				disabled={loading}
				icon={trash}
				iconPosition="left"
				data-test="discard-button"
			>
				{__('Discard', 'extendify-local')}
			</MenuItem>
		</MenuGroup>
	);
};
