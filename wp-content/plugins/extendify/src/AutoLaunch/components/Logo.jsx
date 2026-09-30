import { extendify } from '@auto-launch/icons';
import { Icon } from '@wordpress/icons';

export const Logo = ({ src, name }) => {
	if (src) {
		return (
			<div className="flex h-ui-logo max-w-52 items-center overflow-hidden rounded-ui-logo md:max-w-72">
				<img
					className="h-full w-auto max-w-full rounded-ui-logo object-contain"
					src={src}
					alt={name ?? ''}
				/>
			</div>
		);
	}

	// Drawn in currentColor, so it stays legible on any page color a partner picks.
	return (
		<Icon
			width={undefined}
			icon={extendify}
			className="h-ui-mark w-auto text-ui-page-text"
		/>
	);
};
