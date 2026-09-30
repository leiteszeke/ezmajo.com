import { extendifyLogo } from '@library/icons/extendify-logo';
import { useGlobalsStore } from '@library/state/global';
import { useActivityStore } from '@shared/state/activity';
import { __ } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';

export const MainButton = () => {
	const { setOpen } = useGlobalsStore();
	const { incrementActivity } = useActivityStore();

	const handleClick = () => {
		// Minimize HC if its open
		window.dispatchEvent(new CustomEvent('extendify-hc:minimize'));
		setOpen(true);
		incrementActivity('library-button-click');
	};

	return (
		// biome-ignore lint: allow a button here
		<div
			role="button"
			tabIndex={0}
			onClick={handleClick}
			onKeyDown={(e) => {
				if (!(e.key === 'Enter' || e.key === ' ')) return;
				handleClick();
			}}
			className="components-button has-icon is-primary h-8 min-w-0 cursor-pointer px-2 xs:h-9 sm:ml-2 xl:pr-3"
		>
			<Icon
				icon={extendifyLogo(__('Design Library', 'extendify-local'))}
				size={24}
			/>
			<span className="ml-1 hidden xl:inline">
				{__('Design Library', 'extendify-local')}
			</span>
		</div>
	);
};
