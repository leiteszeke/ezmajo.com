import { magic } from '@agent/icons';
import { useGlobalStore } from '@agent/state/global';
import { useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { chevronUp, Icon } from '@wordpress/icons';

export const Mobile = () => {
	const { isMobile, minimized, setMinimized, setOpen } = useGlobalStore();
	const ref = useRef(null);

	const maximize = () => {
		// A restored minimized:true can pair with open:false, which renders nothing.
		setOpen(true);
		setMinimized(false);
	};

	useEffect(() => {
		if (!isMobile || minimized) return;
		// Set button height as root var
		document.body.style.setProperty(
			'--extendify-agent-mobile-btn-height',
			`${ref.current?.offsetHeight}px`,
		);
	}, [isMobile, minimized]);

	useEffect(() => {
		if (!isMobile) return;
		document.body.classList.add('extendify-agent-mobile-btn-open');
		return () => {
			document.body.classList.remove('extendify-agent-mobile-btn-open');
		};
	}, [isMobile]);

	if (!isMobile || !minimized) return null;

	return (
		<button
			ref={ref}
			type="button"
			className="m-0 flex w-full items-center justify-between gap-2 bg-gray-900 px-4 py-3 font-sans text-white shadow-[0_-1px_0_0_rgba(255,255,255,0.05)]"
			onClick={maximize}
			aria-label={__('Open Agent', 'extendify-local')}
		>
			<div className="flex gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3858e9]">
					<Icon icon={magic} size={24} />
				</div>
				<div className="text-left text-sm rtl:text-right">
					<div className="font-semibold">
						{__('AI Agent', 'extendify-local')}
					</div>
					<div className="text-gray-600">
						{__('How can we help you today?', 'extendify-local')}
					</div>
				</div>
			</div>
			<Icon className="fill-white" icon={chevronUp} size={24} />
		</button>
	);
};
