import { CloseButton } from '@page-creator/components/topbar/CloseButton';
import { extendifyLogo } from '@page-creator/icons/extendify-logo';
import { __, sprintf } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import classNames from 'classnames';

const { partnerLogo, partnerName } = window.extSharedData;

export const Topbar = ({ openOnNewPage, updateUserOption, onClose }) => {
	return (
		<header
			className={classNames(
				'flex max-h-28 flex-row items-center justify-between p-5 md:px-8 md:py-5',
				{
					'bg-banner-main': partnerLogo,
				},
			)}
		>
			<div>
				{partnerLogo ? (
					<div className="flex justify-center bg-banner-main">
						<div className="flex h-6 max-w-40 overflow-hidden md:h-8 md:max-w-64">
							<img
								className="max-h-full max-w-full object-contain"
								src={partnerLogo}
								alt={partnerName}
							/>
						</div>
					</div>
				) : (
					<div className="-mb-5 hidden px-5 py-3 text-extendify-black sm:flex sm:pt-5">
						<Icon icon={extendifyLogo} size={40} />
					</div>
				)}
			</div>
			<div
				className={classNames(
					'flex w-auto flex-shrink-0 items-center justify-end gap-4',
					{
						'text-banner-text': partnerLogo,
					},
				)}
			>
				<label
					className="flex items-center gap-2"
					htmlFor="extendify-open-on-new-pages"
					title={sprintf(
						// translators: %s: Extendify AI Page creator term
						__('Toggle %s on new pages', 'extendify-local'),
						'Extendify AI Page Creator',
					)}
				>
					<input
						id="extendify-open-on-new-pages"
						className="m-0 rounded-xs border border-solid border-gray-900"
						type="checkbox"
						checked={openOnNewPage}
						onChange={(e) =>
							updateUserOption('openOnNewPage', e.target.checked)
						}
					/>
					<span>{__('Open for new pages', 'extendify-local')}</span>
				</label>
				<div>
					<CloseButton onClose={onClose} />
				</div>
			</div>
		</header>
	);
};
