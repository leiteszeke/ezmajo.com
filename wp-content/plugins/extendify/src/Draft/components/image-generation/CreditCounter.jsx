import image from '@draft/svg/Image';
import { Button, Icon } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

export const CreditCounter = ({ usedCredits, total }) => {
	if (usedCredits < total) {
		return (
			<div className="flex items-center justify-center gap-2">
				<Icon className="fill-gray-700" icon={image} size="12px" />
				<p className="mb-0 text-[12px] text-gray-700">
					{sprintf(
						// translators: %1$s is the number of used credits, %2$s is the total credits
						__('%1$s of %2$s daily image credits used', 'extendify-local'),
						usedCredits,
						total,
					)}
				</p>
			</div>
		);
	}

	return (
		<div className="flex gap-3 border-y-0 border-l-4 border-r-0 border-solid border-[#3858E9] bg-gray-100 p-3">
			<div>
				<Icon icon={image} className="fill-gray-900" size="12px" />
			</div>
			<div className="flex flex-col gap-2">
				<p className="mb-0 text-[12px] font-bold text-gray-700">
					{sprintf(
						// translators: %1$s is the number of used credits, %2$s is the total credits
						__('%1$s of %2$s daily image credits used', 'extendify-local'),
						usedCredits,
						total,
					)}
				</p>
				<p className="mb-0 text-gray-900">
					{__(
						'You can still explore and find great images on Unsplash until your credits reset.',
						'extendify-local',
					)}
				</p>
				<Button
					href="https://unsplash.com/"
					variant="primary"
					target="_blank"
					className="justify-center text-center"
				>
					{__('Search on Unsplash', 'extendify-local')}
				</Button>
			</div>
		</div>
	);
};
