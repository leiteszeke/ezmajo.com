import { DropdownTranslate } from '@draft/components/TranslationDropdown';
import { magic, twoLines } from '@draft/svg';
import {
	BlockControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	Dropdown,
	MenuGroup,
	MenuItem,
	NavigableMenu,
	ToolbarButton,
	ToolbarGroup,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as editPostStore } from '@wordpress/edit-post';
import { __, isRTL } from '@wordpress/i18n';
import {
	customPostType,
	Icon,
	paragraph,
	postContent,
	termDescription,
} from '@wordpress/icons';

const supportedBlocks = [
	'core/paragraph',
	'core/list-item',
	'core/verse',
	'core/preformatted',
	'core/heading',
	'core/site-logo',
];

export const ToolbarMenu = (CurrentMenuItems, props) => {
	const { clientId: blockId } = props;
	const { getBlockName, getBlock } = useSelect(
		(select) => select(blockEditorStore),
		[],
	);
	const { getActiveGeneralSidebarName } = useSelect(
		(select) => select(editPostStore),
		[],
	);
	const { openGeneralSidebar } = useDispatch(editPostStore);

	// TODO: Only paragraphs?
	if (!supportedBlocks.includes(getBlockName(blockId))) {
		return <CurrentMenuItems {...props} />;
	}
	const text = getBlock(blockId)?.attributes?.content || '';
	const openDraft = () => openGeneralSidebar('extendify-draft/draft');
	const closeDraft = () => openGeneralSidebar('edit-post/block');
	const toggleDraft = () =>
		getActiveGeneralSidebarName() === 'extendify-draft/draft'
			? closeDraft()
			: openDraft();
	const updatePrompt = (detail) =>
		window.dispatchEvent(
			new CustomEvent('extendify-draft:set-prompt', { detail }),
		);

	return (
		<>
			<CurrentMenuItems {...props} />
			<BlockControls>
				<ToolbarGroup className="extendify-draft">
					<Dropdown
						renderContent={({ onClose }) => (
							<DropdownActions
								text={text}
								closePopup={onClose}
								openDraft={openDraft}
								updatePrompt={updatePrompt}
							/>
						)}
						renderToggle={({ isOpen, onToggle }) => {
							const handleClick = () => {
								if (!text) return toggleDraft();
								onToggle();
							};
							return (
								<ToolbarButton
									className="py-1.5 pl-2 pr-3 text-white before:bg-editor-main before:content-[''] hover:before:bg-editor-main-darker"
									onClick={handleClick}
									aria-expanded={isOpen}
									aria-haspopup="true"
									iconPosition={isRTL() ? 'right' : 'left'}
									icon={magic}
								>
									{__('Ask AI', 'extendify-local')}
								</ToolbarButton>
							);
						}}
					/>
				</ToolbarGroup>
			</BlockControls>
		</>
	);
};

const DropdownActions = ({ text, closePopup, openDraft, updatePrompt }) => {
	const actions = [
		{
			label: __('Improve writing', 'extendify-local'),
			promptType: 'improve-writing',
			systemMessageKey: 'edit',
			icon: <Icon icon={customPostType} />,
			disabled: () => false,
		},
		{
			label: __('Fix spelling & grammar', 'extendify-local'),
			promptType: 'fix-spelling-grammar',
			systemMessageKey: 'edit',
			icon: <Icon icon={termDescription} />,
			disabled: () => false,
		},
		{
			label: __('Simplify language', 'extendify-local'),
			promptType: 'simplify-language',
			systemMessageKey: 'edit',
			icon: <Icon icon={paragraph} />,
			disabled: () => false,
		},
		{
			label: __('Make shorter', 'extendify-local'),
			promptType: 'make-shorter',
			systemMessageKey: 'edit',
			icon: <Icon icon={twoLines} />,
			disabled: () => false,
		},
		{
			label: __('Make longer', 'extendify-local'),
			promptType: 'make-longer',
			systemMessageKey: 'edit',
			icon: <Icon icon={postContent} />,
			disabled: () => false,
		},
	];

	return (
		<NavigableMenu
			orientation="vertical"
			role="menu"
			style={{ minWidth: '200px' }}
		>
			<MenuGroup className="extendify-draft">
				<MenuItem
					key={'custom-prompt'}
					style={{ width: '100%' }}
					isSelected={false}
					disabled={false}
					iconPosition="left"
					icon={magic}
					variant={undefined}
					onClick={() => {
						openDraft?.();
						closePopup?.();
						window.requestAnimationFrame(() =>
							window.requestAnimationFrame(() =>
								document.getElementById('draft-ai-textarea').focus(),
							),
						);
					}}
				>
					{__('Custom prompt', 'extendify-local')}
				</MenuItem>
				{actions.map(
					({ label, promptType, systemMessageKey, disabled, icon }) => (
						<MenuItem
							key={`${promptType}-${promptType}-${systemMessageKey}`}
							style={{ width: '100%' }}
							isSelected={false}
							disabled={disabled()}
							iconPosition={isRTL() ? 'left' : 'right'}
							icon={icon}
							variant={undefined}
							onClick={() => {
								openDraft?.();
								closePopup?.();
								window.requestAnimationFrame(() =>
									window.requestAnimationFrame(() =>
										updatePrompt({ text, promptType, systemMessageKey }),
									),
								);
							}}
						>
							{label}
						</MenuItem>
					),
				)}

				<DropdownTranslate
					text={text}
					closePopup={closePopup}
					openDraft={openDraft}
					updatePrompt={updatePrompt}
				/>
			</MenuGroup>
		</NavigableMenu>
	);
};
