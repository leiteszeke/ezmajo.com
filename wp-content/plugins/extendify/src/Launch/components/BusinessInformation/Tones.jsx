import { useUserSelectionStore } from '@launch/state/user-selections.js';
import { __ } from '@wordpress/i18n';
import classNames from 'classnames';

export const TONES = [
	{
		label: __('Professional', 'extendify-local'),
		value: 'professional',
	},
	{
		label: __('Friendly', 'extendify-local'),
		value: 'friendly',
	},
	{
		label: __('Inspirational', 'extendify-local'),
		value: 'inspirational',
	},
	{
		label: __('Informative', 'extendify-local'),
		value: 'informative',
	},
	{
		label: __('Persuasive', 'extendify-local'),
		value: 'persuasive',
	},
];

export const SiteTones = () => {
	const { businessInformation, setBusinessInformation } =
		useUserSelectionStore();

	const handleTonesToggle = (tone) => {
		const { tones } = businessInformation;
		const isSelected = !!tones?.find(({ value }) => value === tone.value);
		const newTones = isSelected
			? tones?.filter(({ value }) => value !== tone.value)
			: [...tones, tone];
		setBusinessInformation('tones', newTones);
	};

	return (
		<div>
			<p className="m-0 text-lg font-medium leading-8 text-gray-900 md:text-base md:leading-10">
				{__("Select your site's tone", 'extendify-local')}
			</p>
			<div className="justify-left flex w-full flex-wrap gap-2">
				{TONES.map((tone) => {
					const selected = businessInformation?.tones?.find(
						({ value }) => value === tone.value,
					);

					return (
						<div
							key={tone.value}
							className={classNames(
								'relative rounded-sm border border-gray-300',
								{
									'bg-gray-100': selected,
									'border-gray-300': !selected,
								},
							)}
						>
							<label
								htmlFor={tone.value}
								className="flex h-full w-full cursor-pointer items-center justify-between rounded-xs p-2 text-gray-900 focus-within:ring-wp"
							>
								<div className="flex flex-auto items-center">
									<span className="relative mr-1 inline-block h-4 w-4 align-middle rtl:ml-1 rtl:mr-0">
										<input
											id={tone.value}
											className="h-4 w-4 rounded-xs focus:ring-0 focus:ring-offset-0"
											type="checkbox"
											onChange={() => handleTonesToggle(tone)}
											checked={
												!!businessInformation.tones?.find(
													({ value }) => value === tone.value,
												)
											}
										/>
										<svg
											className={classNames(
												'absolute inset-0 -mt-px block h-4 w-4',
												{
													'text-white': selected,
													'text-transparent': !selected,
												},
											)}
											viewBox="1 0 20 20"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
											role="presentation"
										>
											<path
												d="M8.72912 13.7449L5.77536 10.7911L4.76953 11.7899L8.72912 15.7495L17.2291 7.24948L16.2304 6.25073L8.72912 13.7449Z"
												fill="currentColor"
											/>
										</svg>
									</span>
									<span className="font-small text-sm">{tone.label}</span>
								</div>
							</label>
						</div>
					);
				})}
			</div>
		</div>
	);
};
