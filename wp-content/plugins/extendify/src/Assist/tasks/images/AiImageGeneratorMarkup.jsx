import { magic } from '@assist/tasks/images/icons';
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import {
	alignNone,
	chevronLeft,
	chevronUpDown,
	crop,
	dragHandle,
	drawerRight,
	filter,
	helpFilled,
	Icon,
	image,
	link,
	listView,
	moreVertical,
	pencil,
	plus,
	redo,
	undo,
	wordpress,
} from '@wordpress/icons';

export const AiImageGeneratorMarkup = (props) => (
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
		<div className="relative z-10 grid w-full grid-cols-12 px-12">
			<div className="col-span-12 w-full overflow-hidden rounded-t-md border border-gray-300 bg-white shadow-xl">
				<div className="w-[1160px] origin-top-left scale-[0.4] transform rtl:origin-top-right">
					<div className="flex justify-between border-b">
						<div className="flex items-center justify-items-start gap-2">
							<div className="flex min-h-14 min-w-14 items-center justify-center bg-black fill-current text-white">
								<Icon icon={wordpress} size={36} className="m-3" />
							</div>
							<Button variant="primary" icon={plus} size="compact" />
							<Icon icon={pencil} />
							<Icon icon={undo} />
							<Icon icon={redo} />
							<Icon icon={listView} />
						</div>
						<div className="flex items-center justify-items-end gap-2 pr-2">
							<Button variant="secondary" size="compact">
								{__('Save draft', 'extendify-local')}
							</Button>
							<Button variant="primary" size="compact">
								{__('Publish', 'extendify-local')}
							</Button>
							<Button
								isPressed={true}
								icon={magic}
								iconSize={18}
								size="small"
							/>
							<Icon icon={drawerRight} />
							<Button
								size="compact"
								className="flex flex-row-reverse pl-3 pr-2"
								variant="primary"
								icon={helpFilled}
								iconSize={18}
							>
								{__('Help', 'extendify-local')}
							</Button>
							<Icon icon={moreVertical} />
						</div>
					</div>
					<div className="grid grid-cols-12 text-left rtl:text-right">
						<div className="col-span-9 bg-gray-50 px-40 pb-12 pt-4 rtl:col-span-10">
							<h2>{__('A Glimpse into the Arctic', 'extendify-local')}</h2>
							<div className="mb-2.5 text-sm">
								<div className="flex max-w-fit border border-current bg-white">
									<div className="border-r border-current px-1">
										<Button icon={image} />
										<Button icon={dragHandle} />
										<Button icon={chevronUpDown} />
									</div>

									<div className="border-r border-current px-1">
										<Button icon={alignNone} />
										<Button icon={filter} />
										<Button icon={link} />
										<Button icon={crop} />
									</div>
									<div className="flex items-center border-r border-current px-2">
										<Button variant="primary" icon={magic} className="max-h-7">
											{__('Ask AI', 'extendify-local')}
										</Button>
									</div>
									<div className="border-r border-current px-1">
										<Button>{__('Replace', 'extendify-local')}</Button>
									</div>

									<div>
										<Button icon={moreVertical} />
									</div>
								</div>
							</div>
							<img
								className="h-auto w-full"
								alt={__('A group of penguins', 'extendify-local')}
								src="https://images.extendify-cdn.com/assist-tasks/penguins.webp"
							/>
							<p>
								{__(
									'When you think of the Arctic, images of vast ice sheets, chilling winds, and the majestic polar bear might come to mind.',
									'extendify-local',
								)}
							</p>
						</div>
						<div className="col-span-3 border-l border-gray-200 bg-white text-sm rtl:col-span-2">
							<div className="flex items-center gap-2 border-b border-gray-200 py-2 pl-3 pr-2 font-medium">
								<div className="flex">
									<Button icon={chevronLeft} size="small" />
								</div>
								{__('AI image generator', 'extendify-local')}
							</div>
							<div className="p-4">
								<span className="text-xs uppercase">
									{__('Image description', 'extendify-local')}
								</span>
								<div className="mb-4 mt-2 border border-current px-3 py-2.5">
									{__(
										'An image of a group of penguins on an icy Arctic landscape, surrounded by icebergs and snow under a clear blue sky.',
										'extendify-local',
									)}
								</div>
								<span className="text-xs uppercase">
									{__('Aspect Ratio', 'extendify-local')}
								</span>
								<div className="w-fill mb-7 mt-2 flex gap-1 border border-current p-1">
									<div className="flex flex-1 items-center justify-center rounded-xs bg-current p-1">
										<div className="h-3 w-3 bg-white"></div>
									</div>
									<div className="flex flex-1 items-center justify-center p-1">
										<div className="h-3 w-5 bg-current"></div>
									</div>
									<div className="flex flex-1 items-center justify-center p-1">
										<div className="h-4 w-2.5 bg-current"></div>
									</div>
								</div>
								<Button
									variant="primary"
									__next40pxDefaultSize
									className="w-full justify-center"
								>
									{__('Generate Image', 'extendify-local')}
								</Button>
								<div className="mt-5 flex items-center justify-items-center gap-2">
									<Icon icon={image} />
									<div className="pt-1 leading-none">
										{__('0 of 10 daily image credits used', 'extendify-local')}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
);
