import { useGlobalSyncStore } from '@help-center/state/globals-sync';
import { useActivityStore } from '@shared/state/activity';
import { Button } from '@wordpress/components';
import { __, isRTL } from '@wordpress/i18n';
import { helpFilled, Icon } from '@wordpress/icons';
import classNames from 'classnames';

export const PostEditor = () => {
	const { setVisibility } = useGlobalSyncStore();
	const { incrementActivity } = useActivityStore();
	return (
		<Button
			className="is-compact ml-1 hidden gap-1 px-2 md:visible md:inline-flex xl:px-3"
			data-test="help-center-editor-page-button"
			onClick={() => {
				setVisibility('open');
				incrementActivity('hc-editor-page-button');
			}}
			variant="primary"
		>
			<span className="hidden xl:inline">{__('Help', 'extendify-local')}</span>
			<Icon
				icon={helpFilled}
				width={18}
				height={18}
				className={classNames('fill-design-text', {
					'scale-x-[-1]': isRTL(),
				})}
			/>
		</Button>
	);
};
