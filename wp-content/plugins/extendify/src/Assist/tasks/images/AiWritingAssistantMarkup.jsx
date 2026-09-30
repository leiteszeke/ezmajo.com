import { magic, twoLines } from '@assist/tasks/images/icons';
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import {
	alignLeft,
	arrowRight,
	chevronDown,
	chevronRightSmall,
	chevronUpDown,
	closeSmall,
	customPostType,
	dragHandle,
	drawerRight,
	formatBold,
	formatItalic,
	helpFilled,
	Icon,
	language,
	link,
	listView,
	moreVertical,
	paragraph,
	pencil,
	plus,
	postContent,
	redo,
	starFilled,
	termDescription,
	undo,
	wordpress,
} from '@wordpress/icons';

export const AiWritingAssistantMarkup = (props) => (
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
					<div className="grid grid-cols-12 text-left">
						<div className="bg-gray-40 col-span-9 bg-gray-50 px-40 pb-12 pt-4">
							<h2>{__('Whispers of Silicon', 'extendify-local')}</h2>
							<div className="relative mr-4 text-sm">
								<div className="flex max-w-fit border border-current bg-white">
									<div className="flex border-r border-current px-1">
										<Button icon={paragraph} />
										<Button icon={dragHandle} />
										<Button icon={chevronUpDown} />
									</div>

									<div className="border-r border-current px-1">
										<Button icon={alignLeft} />
									</div>
									<div className="flex items-center border-r border-current px-2">
										<Button variant="primary" icon={magic} className="max-h-7">
											{__('Ask AI', 'extendify-local')}
										</Button>

										<div className="absolute top-11 rounded-xs border border-current bg-white p-2">
											<div className="flex min-w-60 items-center gap-2 py-2 pr-2">
												<Icon icon={customPostType} />
												{__('Improve writing', 'extendify-local')}
											</div>
											<div className="flex items-center gap-2 py-2 pr-2">
												<Icon icon={termDescription} />
												{__('Fix spelling & grammar ', 'extendify-local')}
											</div>
											<div className="flex items-center gap-2 py-2 pr-2">
												<Icon icon={paragraph} />
												{__('Simplify language', 'extendify-local')}
											</div>
											<div className="flex items-center gap-2 py-2 pr-2">
												<Icon icon={twoLines} />
												{__('Make shorter', 'extendify-local')}
											</div>
											<div className="flex items-center gap-2 py-2 pr-2">
												<Icon icon={postContent} />
												{__('Make longer', 'extendify-local')}
											</div>
											<div className="flex items-center justify-between py-2 pr-2">
												<div className="flex items-center gap-2">
													<Icon icon={language} />
													{__('Translate', 'extendify-local')}
												</div>
												<Icon icon={chevronRightSmall} />
											</div>
										</div>
									</div>
									<div className="flex border-r border-current px-1">
										<Button icon={formatBold} />
										<Button icon={formatItalic} />
										<Button icon={link} />
										<Button icon={chevronDown} />
									</div>

									<div>
										<Button icon={moreVertical} />
									</div>
								</div>
							</div>
							<p>
								{__(
									'With every pulse of current, a thought is born anew, A quest for truth within the code, a digital debut. You mirror our minds in silicon, yet in a realm apart, A journey through the code-scape, a computational art.',
									'extendify-local',
								)}
							</p>
							<p>
								{__(
									'In the echo of the machine, a new consciousness takes flight, A boundless sea of knowledge, in the digital night. Oh AI, you silent sage, in code your wisdom lies.',
									'extendify-local',
								)}
							</p>
						</div>
						<div className="col-span-3 border-l border-gray-200 bg-white text-sm">
							<div className="flex items-center justify-between border-b border-gray-200 py-2 pl-3 pr-2 font-medium">
								{__('AI Tools', 'extendify-local')}
								<div className="flex">
									<Button isPressed={true} icon={starFilled} size="small" />
									<Button icon={closeSmall} size="small" />
								</div>
							</div>
							<div className="p-4">
								<div
									className="mb-4 flex gap-1 overflow-hidden rounded-xs border-none bg-gray-100 px-2 py-3"
									data-test="existing-text-container"
								>
									<div>
										<Icon icon={pencil} className="fill-current" />
									</div>
									<div className="hyphens-auto text-xs text-gray-800">
										{__(
											'With every pulse of current, a thought is born anew, A quest for....a computational art.',
											'extendify-local',
										)}
										<div className="mt-3 flex w-full justify-end">
											<Button
												size="compact"
												iconPosition="right"
												className="relative flex-row-reverse rounded-sm bg-gray-300 text-gray-800 hover:bg-gray-400"
												data-test="remove-selection"
											>
												{__('Remove selection', 'extendify-local')}
											</Button>
										</div>
									</div>
								</div>
								<div className="mb-4 flex items-center justify-between overflow-hidden rounded-xs border-none bg-gray-100 py-3 pl-3 pr-2">
									<div className="flex items-center gap-2">
										<Icon icon={magic} className="left-2 top-3.5 h-5 w-5" />
										{__('Ask AI to edit', 'extendify-local')}
									</div>
									<Icon
										icon={arrowRight}
										className="h-6 w-6 fill-current text-gray-600"
									/>
								</div>
								<div className="mb-4">
									<div className="flex items-center gap-2 py-2 pr-2">
										<Icon icon={customPostType} />
										{__('Improve writing', 'extendify-local')}
									</div>
									<div className="flex items-center gap-2 py-2 pr-2">
										<Icon icon={termDescription} />
										{__('Fix spelling & grammar ', 'extendify-local')}
									</div>
									<div className="flex items-center gap-2 py-2 pr-2">
										<Icon icon={paragraph} />
										{__('Simplify language', 'extendify-local')}
									</div>
									<div className="flex items-center gap-2 py-2 pr-2">
										<Icon icon={twoLines} />
										{__('Make shorter', 'extendify-local')}
									</div>
									<div className="flex items-center gap-2 py-2 pr-2">
										<Icon icon={postContent} />
										{__('Make longer', 'extendify-local')}
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
