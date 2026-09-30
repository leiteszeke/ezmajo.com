import { Logo } from '@assist/svg';
import { useLayoutEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import classNames from 'classnames';
import { colord } from 'colord';

export const Header = () => {
	const [contrastBg, setContrastBg] = useState();
	const [focusColor, setFocusColor] = useState();

	useLayoutEffect(() => {
		const documentStyles = window.getComputedStyle(document.body);
		const bannerMain = documentStyles.getPropertyValue('--ext-banner-main');
		const b = colord(bannerMain || '#000000');
		const contrast = b.isDark() ? b.lighten(0.1) : b.darken(0.1);
		setContrastBg(contrast.toHex());
		const focus = b.isDark() ? b.lighten(0.3) : b.darken(0.3);
		setFocusColor(focus.toHex());
	}, []);

	return (
		<header className="flex w-full border-b border-gray-400 bg-banner-main">
			<div className="mx-auto mt-auto flex w-full max-w-[996px] flex-col px-4">
				<div className="my-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-6">
					{window.extSharedData?.partnerLogo && (
						<div className="flex h-10 max-w-52 overflow-hidden md:max-w-72">
							<img
								className="max-h-full max-w-full object-contain"
								src={window.extSharedData.partnerLogo}
								alt={window.extSharedData.partnerName}
							/>
						</div>
					)}
					{!window.extSharedData?.partnerLogo && (
						<Logo className="logo max-h-9 w-32 text-banner-text sm:w-40" />
					)}
					<div
						id="assist-menu-bar"
						className={classNames(
							'flex-wrap items-center gap-4 lg:flex lg:w-auto',
						)}
					>
						<a
							style={{
								borderColor: contrastBg,
								'--tw-ring-color': focusColor,
								'--ext-override': focusColor,
							}}
							className="block cursor-pointer rounded-xs border border-gray-500 bg-white px-4 py-2 text-center text-sm text-gray-900 no-underline transition-colors duration-200 hover:bg-gray-100 focus:outline-hidden focus:ring focus:ring-gray-900 focus:ring-offset-1 lg:inline-block lg:rounded-xs"
							href={window.extSharedData.homeUrl}
							target="_blank"
						>
							{__('View site', 'extendify-local')}
						</a>
					</div>
				</div>
			</div>
		</header>
	);
};
