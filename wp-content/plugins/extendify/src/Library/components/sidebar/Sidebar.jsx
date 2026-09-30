import { CategoryControl } from '@library/components/sidebar/CategoryControl';
import { extendifyLogo } from '@library/icons/extendify-logo';
import { Icon } from '@wordpress/icons';

const { partnerLogo, partnerName } = window.extSharedData;
export const Sidebar = () => {
	return (
		<div className="hidden flex-shrink-0 flex-col gap-6 md:flex md:w-80">
			{partnerLogo ? (
				<div className="flex justify-center bg-banner-main p-6 py-0">
					<div className="flex h-20 w-40 items-center justify-center py-3">
						<img
							className="max-h-full max-w-full"
							src={partnerLogo}
							alt={partnerName}
						/>
					</div>
				</div>
			) : (
				<div className="-mb-5 hidden px-5 py-3 text-extendify-black sm:flex sm:pt-5">
					<Icon icon={extendifyLogo()} size={40} />
				</div>
			)}
			<div className="flex flex-col gap-4 overflow-y-auto pb-16">
				<div
					id="extendify-library-category-control"
					data-test="category-control"
					className="hidden flex-col overflow-x-hidden px-4 md:flex"
				>
					<CategoryControl />
				</div>
			</div>
		</div>
	);
};
