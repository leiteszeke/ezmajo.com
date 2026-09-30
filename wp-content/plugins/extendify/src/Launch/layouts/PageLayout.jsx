import { PageControl } from '@launch/components/PageControl';
import { Logo } from '@launch/svg';

export const PageLayout = ({ children, includeNav = true }) => {
	return (
		<div className="flex h-[calc(100dvh)] flex-col">
			<div className="w-full flex-none bg-banner-main px-6 py-5 md:px-12 md:py-6">
				{window.extSharedData?.partnerLogo ? (
					<div className="flex h-10 max-w-52 items-center overflow-hidden md:max-w-72">
						<img
							className="max-h-full max-w-full object-contain"
							src={window.extSharedData.partnerLogo}
							alt={window.extSharedData?.partnerName ?? ''}
						/>
					</div>
				) : (
					<Logo className="h-8 w-auto text-banner-text" />
				)}
			</div>
			{children}
			{includeNav && <PageControl />}
		</div>
	);
};
