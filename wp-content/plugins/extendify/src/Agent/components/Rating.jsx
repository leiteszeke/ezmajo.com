import { rateAnswer } from '@agent/api';
import { thumbDown, thumbUp } from '@agent/icons';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import classnames from 'classnames';

export const Rating = ({ answerId }) => {
	const [rating, setRating] = useState(undefined);

	useEffect(() => {
		if (!answerId) return;
		if (rating === undefined) return;
		rateAnswer({ answerId, rating });
	}, [rating, answerId]);

	return (
		<div className="flex items-center justify-end">
			<div className="flex items-center gap-px rounded-xl border border-gray-400 bg-gray-50 px-2 text-right">
				<button
					type="button"
					aria-pressed={rating === 1}
					aria-live="polite"
					onClick={() => setRating((current) => (current === 1 ? 0 : 1))}
					aria-label={
						rating === 1
							? __('Remove rating', 'extendify-local')
							: __('Rate that this answer was helpful', 'extendify-local')
					}
					className={classnames(
						'm-0 h-6 border-0 bg-transparent p-0 hover:text-design-main',
						{
							'text-design-main': rating === 1,
							'text-gray-600': rating !== 1,
						},
					)}
				>
					<Icon className="fill-current" icon={thumbUp} />
				</button>

				<button
					type="button"
					aria-pressed={rating === -1}
					aria-live="polite"
					onClick={() => setRating((current) => (current === -1 ? 0 : -1))}
					aria-label={
						rating === -1
							? __('Remove rating', 'extendify-local')
							: __('Rate that this answer was not helpful', 'extendify-local')
					}
					className={classnames(
						'm-0 h-6 border-0 bg-transparent p-0 hover:text-design-main',
						{
							'text-design-main': rating === -1,
							'text-gray-600': rating !== -1,
						},
					)}
				>
					<Icon className="fill-current" icon={thumbDown} />
				</button>
			</div>
		</div>
	);
};
