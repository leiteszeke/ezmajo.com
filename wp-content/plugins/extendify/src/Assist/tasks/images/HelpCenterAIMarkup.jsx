import { playIcon, robot, send } from '@assist/tasks/images/icons';
import { __ } from '@wordpress/i18n';
import {
	chevronLeft,
	chevronRight,
	closeSmall,
	Icon,
	lineSolid,
} from '@wordpress/icons';

export const HelpCenterAIMarkup = (props) => (
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
			<div className="absolute -left-14 m-0 w-fit flex-1 origin-top scale-[0.395] transform">
				<div className="w-[420px] overflow-hidden rounded-xl border border-gray-400 bg-white shadow-xl">
					<div className="flex w-full content-center gap-4 border-b bg-banner-main py-6 pl-4 pr-6 text-design-text">
						<Icon
							icon={chevronLeft}
							className="fill-banner-text text-banner-text"
						/>

						<span className="border-banner-text text-base font-medium text-banner-text">
							{__('AI Chatbot', 'extendify-local')}
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
					<div className="flex min-h-96 w-fit flex-col justify-center bg-design-main px-6 py-6 text-design-text">
						<h4 className="text-base m-0 font-medium opacity-80">
							{__('Hi there!', 'extendify-local')}
						</h4>
						<p className="m-0 mt-1 text-2xl font-medium">
							{__('Ask me any questions about WordPress.', 'extendify-local')}
						</p>

						<div className="mt-6 flex justify-between rounded-md border bg-white px-3 py-3.5 text-gray-700">
							<div className="w-80">
								{__('Ask your WordPress question...', 'extendify-local')}
							</div>
							<Icon icon={send} />
						</div>
					</div>
					<div className="m-6 mt-7 rounded-md border border-gray-200 p-4">
						<div className="flex w-full items-center justify-between gap-2">
							<div className="flex-1 pl-1 text-xs text-gray-800">
								{__(
									'For other questions, visit our support page.',
									'extendify-local',
								)}
							</div>
							<Icon
								icon={chevronRight}
								size={18}
								className="fill-current text-gray-700"
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="absolute top-12 m-0 w-fit flex-1 origin-top scale-[0.395] transform">
				<div className="w-[420px] overflow-hidden rounded-xl border border-gray-400 bg-white shadow-xl">
					<div className="flex w-full content-center gap-4 border-b bg-banner-main py-6 pl-4 pr-6 text-design-text">
						<Icon
							icon={chevronLeft}
							className="fill-banner-text text-banner-text"
						/>

						<span className="border-banner-text text-base font-medium text-banner-text">
							{__('AI Chatbot', 'extendify-local')}
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

					<div className="mt-2 flex flex-col gap-6 px-5 py-4 pb-6">
						<div className="flex justify-end">
							<div className="rounded-lg bg-gray-800 p-5 text-sm text-design-text">
								{__(
									'How do I add a new page to my website?',
									'extendify-local',
								)}
							</div>
						</div>

						<div className="relative mr-6">
							<div className="absolute z-10 -ml-2 -mt-4 flex items-center rounded-full bg-design-main p-2">
								<Icon
									icon={robot}
									className="h-4 w-4 fill-current text-design-text"
								/>
							</div>
							<div className="rounded-lg bg-gray-100 p-5 text-sm text-gray-800">
								<p>
									{__(
										'To add a new page to your website, log in to your website dashboard and locate the "Pages" section in the sidebar, then click on "Add New". Enter the title for your new page at the top and start adding content using the available blocks by clicking the "+" button in the editor.',
										'extendify-local',
									)}
								</p>

								<p>
									{__(
										'Customize the page layout, design, and elements as needed. Finally, click "Publish" or "Update" on the top-right corner to make the page live on your website. You have now successfully added a new page.',
										'extendify-local',
									)}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="absolute -right-14 top-24 m-0 w-fit flex-1 origin-top scale-[0.395] transform">
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
