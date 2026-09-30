import { playIcon, toursIcon } from '@assist/tasks/images/icons';
import { __ } from '@wordpress/i18n';
import {
	chevronLeft,
	chevronRight,
	closeSmall,
	Icon,
	lineSolid,
	postComments,
	redo,
	search,
} from '@wordpress/icons';

export const HelpCenterMarkup = (props) => (
	<div {...props}>
		<div className="absolute top-1.5 z-0 flex h-20 w-44 flex-wrap gap-3">
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
			<div className="h-1 w-1 rounded-full bg-gray-200"></div>
		</div>
		<div className="relative z-10 flex justify-center text-left">
			<div className="absolute left-0 m-0 w-fit flex-1 origin-top scale-[0.395] transform">
				<div className="w-[420px] overflow-hidden rounded-xl border border-gray-400 bg-white shadow-xl">
					<div className="flex w-full content-center gap-4 border-b bg-banner-main py-6 pl-4 pr-6 text-design-text">
						<div className="flex h-6 max-w-[9rem] justify-center overflow-hidden bg-banner-main after:relative after:-right-3 after:mr-3 after:text-banner-text after:opacity-40 after:content-['|']">
							<img
								alt={__('Partner Logo', 'extendify-local')}
								className="max-h-full max-w-full object-contain"
								src={window.extSharedData.partnerLogo}
							/>
						</div>

						<span className="border-banner-text text-base font-medium text-banner-text">
							{__('Help Center', 'extendify-local')}
						</span>
						<Icon
							icon={lineSolid}
							className="ml-auto fill-banner-text text-banner-text"
						/>
						<Icon
							icon={closeSmall}
							className="fill-banner-text text-banner-text"
						/>
					</div>
					<div className="px-4 py-6">
						<div className="rounded-md border border-gray-300 pb-2.5">
							<div className="bg-gray-100 p-3">
								<div className="mb-3 text-lg font-semibold">
									{__('Knowledge base', 'extendify-local')}
								</div>
								<div className="flex justify-between bg-white px-3 py-2 opacity-75">
									{__('What do you need help with?', 'extendify-local')}

									<Icon icon={search} />
								</div>
							</div>
							<div className="px-2 py-1">
								<Icon
									icon={redo}
									className="rotate-180 transform fill-gray-700"
								/>
								{__('WordPress Block Editor', 'extendify-local')}
							</div>
							<div className="px-2 py-1">
								<Icon
									icon={redo}
									className="rotate-180 transform fill-gray-700"
								/>
								{__('Overview of blocks', 'extendify-local')}
							</div>
							<div className="px-2 py-1">
								<Icon
									icon={redo}
									className="rotate-180 transform fill-gray-700"
								/>
								{__('Adding blocks', 'extendify-local')}
							</div>
							<div className="px-2 py-1">
								<Icon
									icon={redo}
									className="rotate-180 transform fill-gray-700"
								/>
								{__('Block Patterns', 'extendify-local')}
							</div>
							<div className="px-2 py-1">
								<Icon
									icon={redo}
									className="rotate-180 transform fill-gray-700"
								/>
								{__('Block Pattern Directory', 'extendify-local')}
							</div>
						</div>
						<div className="mt-3 rounded-md border border-gray-200 p-3 pb-3">
							<div className="flex w-full justify-between gap-2 pb-3">
								<Icon
									icon={toursIcon}
									className="rounded-full border-0 bg-design-main fill-design-text p-2"
									size={48}
								/>
								<div className="grow pl-1">
									<h4 className="m-0 p-0 text-lg font-medium">
										{__('Tours', 'extendify-local')}
									</h4>
									<p className="m-0 p-0 text-xs text-gray-800">
										{__(
											'Learn more about your WordPress admin',
											'extendify-local',
										)}
									</p>
								</div>
								<div className="flex h-12 grow-0 items-center justify-between">
									<Icon
										icon={chevronRight}
										size={24}
										className="fill-current text-gray-700"
									/>
								</div>
							</div>
							<div className="text-base flex w-full items-center justify-between gap-2 border-t border-gray-200 bg-transparent pl-20 pt-3 text-left font-medium text-gray-900">
								{__('Tour this page', 'extendify-local')}
								<Icon icon={playIcon} size={16} />
							</div>
						</div>
						<div className="mt-3 rounded-md border border-gray-200 p-3 pb-3">
							<div className="flex w-full justify-between gap-2">
								<Icon
									icon={postComments}
									className="rounded-full border-0 bg-design-main fill-design-text p-2"
									size={48}
								/>
								<div className="grow pl-1">
									<h4 className="m-0 p-0 text-lg font-medium">
										{__('Ask AI', 'extendify-local')}
									</h4>
									<p className="m-0 p-0 text-xs text-gray-800">
										{__('Got questions? Ask our AI chatbot', 'extendify-local')}
									</p>
								</div>
								<div className="flex h-12 grow-0 items-center justify-between">
									<Icon
										icon={chevronRight}
										size={24}
										className="fill-current text-gray-700"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="absolute right-0 top-12 m-0 w-fit flex-1 origin-top scale-[0.395] transform">
				<div className="w-[420px] overflow-hidden rounded-xl border border-gray-400 bg-white shadow-xl">
					<div className="flex w-full content-center gap-4 border-b bg-banner-main py-6 pl-4 pr-6 text-design-text">
						<Icon
							icon={chevronLeft}
							className="fill-banner-text text-banner-text"
						/>

						<span className="border-banner-text text-base font-medium text-banner-text">
							{__('Tours', 'extendify-local')}
						</span>
						<Icon
							icon={lineSolid}
							className="ml-auto fill-banner-text text-banner-text"
						/>
						<Icon
							icon={closeSmall}
							className="fill-banner-text text-banner-text"
						/>
					</div>
					<div className="mt-2 flex flex-col gap-3 px-5 py-4">
						<div className="flex content-center justify-between rounded-sm bg-gray-100 px-5 py-4">
							{__('Getting started with WordPress', 'extendify-local')}
							<Icon icon={playIcon} />
						</div>
						<div className="flex content-center justify-between rounded-sm bg-gray-100 px-5 py-4">
							{__('Installing a plugin', 'extendify-local')}
							<Icon icon={playIcon} />
						</div>
						<div className="flex content-center justify-between rounded-sm bg-gray-100 px-5 py-4">
							{__('Plugin management', 'extendify-local')}
							<Icon icon={playIcon} />
						</div>
						<div className="flex content-center justify-between rounded-sm bg-gray-100 px-5 py-4">
							{__('Page editor', 'extendify-local')}
							<Icon icon={playIcon} />
						</div>
						<div className="flex content-center justify-between rounded-sm bg-gray-100 px-5 py-4">
							{__('Design Library', 'extendify-local')}
							<Icon icon={playIcon} />
						</div>
						<div className="flex content-center justify-between rounded-sm bg-gray-100 px-5 py-4">
							{__('Users screen', 'extendify-local')}
							<Icon icon={playIcon} />
						</div>
						<div className="flex content-center justify-between rounded-sm bg-gray-100 px-5 py-4">
							{__('Site Assistant', 'extendify-local')}
							<Icon icon={playIcon} />
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
);
