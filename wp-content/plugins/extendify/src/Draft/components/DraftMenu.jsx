import { MenuGroup, MenuItem } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { pencil } from '@wordpress/icons';

export const DraftMenu = ({ disabled, setInputText, setReady }) => {
	const handleClick = (inputText) => {
		setInputText(inputText);
		setReady(false);
	};

	const actionsList = [
		{
			label: __('A paragraph …', 'extendify-local'),
			onClickText: __('Write a paragraph about', 'extendify-local'),
		},
		{
			label: __('Blog post …', 'extendify-local'),
			onClickText: __('Write a blog post about', 'extendify-local'),
		},
		{
			label: __('An informative article …', 'extendify-local'),
			onClickText: __('Write an informative article about', 'extendify-local'),
		},
		{
			label: __('Headline …', 'extendify-local'),
			onClickText: __('Write a headline for', 'extendify-local'),
		},
		{
			label: __('List …', 'extendify-local'),
			onClickText: __('Write a list of', 'extendify-local'),
		},
	];

	return (
		<MenuGroup>
			{actionsList.map(({ label, onClickText }) => (
				<MenuItem
					key={label}
					onClick={() => handleClick(`${onClickText} `)}
					disabled={disabled}
					icon={pencil}
					iconPosition="left"
				>
					{label}
				</MenuItem>
			))}
		</MenuGroup>
	);
};
