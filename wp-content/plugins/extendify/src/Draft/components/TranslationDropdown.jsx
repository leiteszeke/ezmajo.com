import { magic } from '@draft/svg';
import { Dropdown, MenuGroup, MenuItem } from '@wordpress/components';
import { __, isRTL } from '@wordpress/i18n';
import { chevronLeft, chevronRight, Icon, language } from '@wordpress/icons';

export const DropdownTranslate = ({
	text,
	closePopup,
	openDraft,
	updatePrompt,
}) => {
	const items = [
		{
			language: __('Arabic', 'extendify-local'),
			code: 'ar',
			languageName: 'Arabic',
		},
		{
			language: __('Arabic (Morocco)', 'extendify-local'),
			code: 'ary',
			languageName: 'Arabic (Morocco)',
		},
		{
			language: __('Bulgarian', 'extendify-local'),
			code: 'bg_BG',
			languageName: 'Bulgarian',
		},
		{
			language: __('Catalan', 'extendify-local'),
			code: 'ca',
			languageName: 'Catalan',
		},
		{
			language: __('Czech', 'extendify-local'),
			code: 'cs_CZ',
			languageName: 'Czech',
		},
		{
			language: __('Danish', 'extendify-local'),
			code: 'da_DK',
			languageName: 'Danish',
		},
		{
			language: __('Dutch', 'extendify-local'),
			code: 'nl_NL',
			languageName: 'Dutch',
		},
		{
			language: __('Dutch (Belgium)', 'extendify-local'),
			code: 'de_BE',
			languageName: 'Dutch (Belgium)',
		},
		{
			language: __('English', 'extendify-local'),
			code: 'en',
			languageName: 'English',
		},
		{
			language: __('English (UK)', 'extendify-local'),
			code: 'en_GB',
			languageName: 'English (UK)',
		},
		{
			language: __('Estonian', 'extendify-local'),
			code: 'et',
			languageName: 'Estonian',
		},
		{
			language: __('Finnish', 'extendify-local'),
			code: 'fi',
			languageName: 'Finnish',
		},
		{
			language: __('French (Belgium)', 'extendify-local'),
			code: 'fr_BE',
			languageName: 'French (Belgium)',
		},
		{
			language: __('French (Canada)', 'extendify-local'),
			code: 'fr_CA',
			languageName: 'French (Canada)',
		},
		{
			language: __('French (France)', 'extendify-local'),
			code: 'fr_FR',
			languageName: 'French (France)',
		},
		{
			language: __('German', 'extendify-local'),
			code: 'de_DE',
			languageName: 'German',
		},
		{
			language: __('German (Switzerland)', 'extendify-local'),
			code: 'de_CH',
			languageName: 'German (Switzerland)',
		},
		{
			language: __('Greek', 'extendify-local'),
			code: 'el',
			languageName: 'Greek',
		},
		{
			language: __('Hebrew', 'extendify-local'),
			code: 'he_IL',
			languageName: 'Hebrew',
		},
		{
			language: __('Hindi', 'extendify-local'),
			code: 'hi_IN',
			languageName: 'Hindi',
		},
		{
			language: __('Hungarian', 'extendify-local'),
			code: 'hu_HU',
			languageName: 'Hungarian',
		},
		{
			language: __('Indonesian', 'extendify-local'),
			code: 'id_ID',
			languageName: 'Indonesian',
		},
		{
			language: __('Italian', 'extendify-local'),
			code: 'it_IT',
			languageName: 'Italian',
		},
		{
			language: __('Japanese', 'extendify-local'),
			code: 'jp',
			languageName: 'Japanese',
		},
		{
			language: __('Lithuanian', 'extendify-local'),
			code: 'lt_LT',
			languageName: 'Lithuanian',
		},
		{
			language: __('Latvian', 'extendify-local'),
			code: 'lv',
			languageName: 'Latvian',
		},
		{
			language: __('Norwegian', 'extendify-local'),
			code: 'nb_NO',
			languageName: 'Norwegian',
		},
		{
			language: __('Polish', 'extendify-local'),
			code: 'pl_PL',
			languageName: 'Polish',
		},
		{
			language: __('Portuguese (Brazil)', 'extendify-local'),
			code: 'pt_BR',
			languageName: 'Portuguese (Brazil)',
		},
		{
			language: __('Portuguese (Portugal)', 'extendify-local'),
			code: 'pt_PT',
			languageName: 'Portuguese (Portugal)',
		},
		{
			language: __('Romanian', 'extendify-local'),
			code: 'ro_RO',
			languageName: 'Romanian',
		},
		{
			language: __('Russian', 'extendify-local'),
			code: 'ru_RU',
			languageName: 'Russian',
		},
		{
			language: __('Slovak', 'extendify-local'),
			code: 'sk_SK',
			languageName: 'Slovak',
		},
		{
			language: __('Spanish (Spain)', 'extendify-local'),
			code: 'es_ES',
			languageName: 'Spanish (Spain)',
		},
		{
			language: __('Spanish (Colombia)', 'extendify-local'),
			code: 'es_CO',
			languageName: 'Spanish (Colombia)',
		},
		{
			language: __('Spanish (Mexico)', 'extendify-local'),
			code: 'es_MX',
			languageName: 'Spanish (Mexico)',
		},
		{
			language: __('Swedish', 'extendify-local'),
			code: 'sv_SE',
			languageName: 'Swedish',
		},
		{
			language: __('Turkish', 'extendify-local'),
			code: 'tr_TR',
			languageName: 'Turkish',
		},
		{
			language: __('Ukrainian', 'extendify-local'),
			code: 'uk',
			languageName: 'Ukrainian',
		},
		{
			language: __('Vietnamese', 'extendify-local'),
			code: 'vi',
			languageName: 'Vietnamese',
		},
	];

	return (
		<Dropdown
			className="my-container-class-name flex w-full items-center justify-between"
			contentClassName="my-dropdown-content-classname"
			popoverProps={{ placement: 'right-start' }}
			renderToggle={({ isOpen, onToggle }) => (
				<div className="group flex w-full items-center justify-between hover:text-design-main">
					<MenuItem
						className="flex w-full justify-between"
						icon={language}
						iconPosition={isRTL() ? 'left' : 'right'}
						variant={undefined}
						onClick={onToggle}
						aria-expanded={isOpen}
					>
						{__('Translate', 'extendify-local')}
					</MenuItem>
					<Icon
						icon={isRTL() ? chevronLeft : chevronRight}
						size={24}
						className="fill-current group-hover:text-current"
					/>
				</div>
			)}
			renderContent={() => (
				<MenuGroup
					className="extendify-draft"
					label={
						<div className="flex items-center gap-2">
							<Icon className="fill-gray-900" size={16} icon={magic} />
							{__('Translate to...', 'extendify-local')}
						</div>
					}
				>
					{items.map(
						({
							language,
							code,
							languageName,
							promptType = 'translate',
							systemMessageKey = 'edit',
						}) => (
							<MenuItem
								key={`${promptType}-${code}-${systemMessageKey}`}
								style={{ width: '100%' }}
								isSelected={false}
								disabled={false}
								variant={undefined}
								onClick={() => {
									openDraft?.();
									closePopup?.();
									window.requestAnimationFrame(() =>
										window.requestAnimationFrame(() =>
											updatePrompt({
												text,
												promptType,
												systemMessageKey,
												details: { languageInto: languageName },
											}),
										),
									);
								}}
							>
								{language}
							</MenuItem>
						),
					)}
				</MenuGroup>
			)}
		/>
	);
};
