import { useGlobalSyncStore } from '@help-center/state/globals-sync';
import { useActivityStore } from '@shared/state/activity';
import { Icon } from '@wordpress/components';
import { __, isRTL } from '@wordpress/i18n';
import { helpFilled } from '@wordpress/icons';
import classNames from 'classnames';

export const AdminBar = () => {
	const { setVisibility } = useGlobalSyncStore();
	const { incrementActivity } = useActivityStore();

	return (
		<button
			type="button"
			data-test="help-center-adminbar-button"
			onClick={() => {
				setVisibility('open');
				incrementActivity('hc-admin-bar-button');
			}}
			className="m-1.5 -mt-1 inline-flex h-6 items-center justify-center gap-1 rounded-xs border-0 bg-wp-theme-main px-2 leading-extra-tight text-white ring-offset-1 ring-offset-wp-theme-bg focus:outline-hidden focus:ring-wp focus:ring-wp-theme-main"
		>
			{__('Help', 'extendify-local')}
			<Icon
				icon={helpFilled}
				width={18}
				height={18}
				className={classNames('fill-design-text', {
					'scale-x-[-1]': isRTL(),
				})}
			/>
		</button>
	);
};
