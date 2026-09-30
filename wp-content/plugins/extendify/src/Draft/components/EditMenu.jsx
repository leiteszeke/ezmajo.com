import { useContentHighlight } from '@draft/hooks/useContentHighlight';
import { useSelectedText } from '@draft/hooks/useSelectedText';
import { twoLines } from '@draft/svg';
import { MenuGroup, MenuItem } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	customPostType,
	Icon,
	paragraph,
	postContent,
	termDescription,
} from '@wordpress/icons';

export const EditMenu = ({ disabled, setPrompt }) => {
	const { toggleHighlight } = useContentHighlight();
	const { selectedText } = useSelectedText();

	const selectedBlockClientIds = useSelect(
		(select) => select('core/block-editor').getSelectedBlockClientIds(),
		[],
	);

	useEffect(() => {
		return () => {
			toggleHighlight(selectedBlockClientIds, { isHighlighted: false });
		};
	}, [selectedBlockClientIds, toggleHighlight]);

	const handleClick = (promptType) => {
		setPrompt({
			text: selectedText,
			promptType,
			systemMessageKey: 'edit',
		});
	};

	const actionsList = [
		{
			label: __('Improve writing', 'extendify-local'),
			promptType: 'improve-writing',
			systemMessageKey: 'edit',
			icon: <Icon icon={customPostType} />,
		},
		{
			label: __('Fix spelling & grammar', 'extendify-local'),
			promptType: 'fix-spelling-grammar',
			icon: <Icon icon={termDescription} />,
		},
		{
			label: __('Simplify language', 'extendify-local'),
			promptType: 'simplify-language',
			icon: <Icon icon={paragraph} />,
		},
		{
			label: __('Make shorter', 'extendify-local'),
			promptType: 'make-shorter',
			icon: <Icon icon={twoLines} />,
		},
		{
			label: __('Make longer', 'extendify-local'),
			promptType: 'make-longer',
			icon: <Icon icon={postContent} />,
		},
	];

	return (
		<MenuGroup>
			{actionsList.map(({ label, promptType, icon }) => (
				<MenuItem
					key={`${promptType}-${promptType}-edit`}
					onClick={() => handleClick(promptType)}
					onMouseEnter={() =>
						toggleHighlight(selectedBlockClientIds, {
							isHighlighted: true,
						})
					}
					onMouseLeave={() =>
						toggleHighlight(selectedBlockClientIds, {
							isHighlighted: false,
						})
					}
					icon={icon}
					iconPosition="left"
					disabled={disabled}
					className="group"
				>
					<span className="whitespace-normal text-left rtl:text-right">
						{label}
					</span>
				</MenuItem>
			))}
		</MenuGroup>
	);
};
