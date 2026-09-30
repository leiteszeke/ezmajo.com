import { Checkmark } from '@launch/svg';
import classNames from 'classnames';

export const Card = ({
	image,
	heading,
	name,
	description,
	selected,
	onClick,
	lock,
}) => {
	return (
		// biome-ignore lint: refactor this later
		<div
			role={lock ? undefined : 'button'}
			tabIndex={lock ? undefined : 0}
			aria-label={lock ? undefined : name}
			className={classNames(
				'overflow-hidden rounded-lg border border-gray-100 bg-transparent p-0 text-base',
				{
					'button-focus': !lock,
				},
			)}
			onKeyDown={(e) => {
				if (['Enter', 'Space', ' '].includes(e.key)) {
					if (!lock) onClick();
				}
			}}
			onClick={() => {
				if (!lock) onClick();
			}}
		>
			<div className="flex min-w-sm justify-between border-b border-gray-100 p-2">
				<div
					className={classNames('flex items-center', {
						'text-gray-700': !selected,
					})}
				>
					<span className="text-left">{name}</span>
					{lock && (
						<span className="dashicons dashicons-lock mr-6 h-4 w-4 pl-2 text-base leading-none"></span>
					)}
				</div>
				{(lock || selected) && <Checkmark className="w-6 text-design-main" />}
			</div>
			<div className="flex flex-col">
				{image ? (
					<div
						style={{ backgroundImage: `url(${image})` }}
						className="h-32 bg-cover"
					/>
				) : (
					<div className="h-32 bg-gray-100" />
				)}
				<div className="p-6">
					<div className="mb-2 text-left text-base font-bold">{heading}</div>
					<div className="text-left text-sm">{description}</div>
				</div>
			</div>
		</div>
	);
};
