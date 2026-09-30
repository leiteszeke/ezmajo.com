import { CloseButton } from '@library/components/topbar/CloseButton';
import { __, sprintf } from '@wordpress/i18n';

export const Topbar = ({ openOnNewPage, updateUserOption, onClose }) => {
	return (
		<div className="mb-2 flex h-16 flex-shrink-0 items-center justify-end gap-6 px-8">
			<label
				className="mt-4 flex items-center gap-2"
				htmlFor="extendify-open-on-new-pages"
				title={sprintf(
					// translators: %s: Extendify Library term
					__('Toggle %s on new pages', 'extendify-local'),
					'Extendify Library',
				)}
			>
				<input
					id="extendify-open-on-new-pages"
					className="m-0 rounded-xs border border-solid border-gray-900"
					type="checkbox"
					checked={openOnNewPage}
					onChange={(e) => updateUserOption('openOnNewPage', e.target.checked)}
				/>
				<span>{__('Open for new pages', 'extendify-local')}</span>
			</label>
			<div className="mt-4">
				<CloseButton onClose={onClose} />
			</div>
		</div>
	);
};
