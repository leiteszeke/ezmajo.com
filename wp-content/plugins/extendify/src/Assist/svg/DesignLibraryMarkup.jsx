import { __ } from '@wordpress/i18n';
import { chevronDown, chevronUp, Icon, quote } from '@wordpress/icons';

export default function DesignLibraryMarkup(props) {
	return (
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
					<div className="w-max origin-top-left scale-[0.48] transform rtl:origin-top-right">
						<div className="w-full text-left">
							<div className="grid grid-cols-12">
								<div className="col-span-3 flex-none border-r border-gray-200 bg-white text-sm">
									<div className="flex justify-center border-b bg-banner-main p-6 py-0">
										<div className="flex h-20 w-40 items-center justify-center py-3">
											<img
												alt={__('Partner Logo', 'extendify-local')}
												className="max-h-full max-w-full"
												src={window.extSharedData.partnerLogo}
											/>
										</div>
									</div>
									<div className="px-5">
										<div className="mt-6 flex w-full items-center justify-between gap-1 rounded-xs border border-gray-400 p-3">
											{__('Site type: Consultant', 'extendify-local')}
											<Icon icon={chevronDown} />
										</div>
										<div className="mt-8 flex w-full items-center justify-between gap-1 rounded-xs border border-gray-400 p-3">
											{__('Pattern Type', 'extendify-local')}
											<Icon icon={chevronUp} />
										</div>
										<div className="flex w-full flex-col justify-items-start gap-1 rounded-xs border border-t-0 border-gray-400 p-3 text-xs rtl:text-right">
											<div className="bg-design-main px-3 py-2 text-design-text">
												{__('All', 'extendify-local')}
											</div>
											<div className="px-3 py-1">
												{__('Call to Action', 'extendify-local')}
											</div>
											<div className="px-3 py-1">
												{__('Content', 'extendify-local')}
											</div>
											<div className="px-3 py-1">
												{__('Hero', 'extendify-local')}
											</div>
											<div className="px-3 py-1">
												{__('Pricing', 'extendify-local')}
											</div>
											<div className="px-3 py-1">
												{__('Social Proof', 'extendify-local')}
											</div>
											<div className="px-3 py-1">
												{__('Team', 'extendify-local')}
											</div>
										</div>
									</div>
								</div>
								<div className="col-span-9">
									<div className="absolute origin-top-left scale-[0.245] bg-gray-50 px-16 pt-16 rtl:origin-top-right">
										<div className="flex w-[2880px] gap-10 text-xl leading-normal">
											<div className="flex flex-col gap-10">
												<div className="border-4 bg-white px-20 py-24">
													<div className="mb-4 text-5xl font-semibold">
														{__(
															'World class service offerings',
															'extendify-local',
														)}
													</div>
													<div className="w-2/4">
														{__(
															'Power Leap Consulting: Your trusted partner for business success. We specialize in strategic planning, transformation, and growth acceleration.',
															'extendify-local',
														)}
													</div>
													<div className="mt-16 grid grid-cols-3 gap-8">
														<div>
															<img
																alt={__(
																	'Person using a laptop',
																	'extendify-local',
																)}
																className="h-auto w-full max-w-full"
																src="https://images.extendify-cdn.com/assist-tasks/design-library/using-laptop.webp"
															/>
															<div className="mb-2 mt-6 text-3xl font-semibold">
																{__('Consulting Services', 'extendify-local')}
															</div>
															{__(
																'Develop a roadmap for success with our Business Strategy service.',
																'extendify-local',
															)}
														</div>
														<div>
															<img
																alt={__(
																	'Two people talking',
																	'extendify-local',
																)}
																className="h-auto w-full max-w-full"
																src="https://images.extendify-cdn.com/assist-tasks/design-library/two-person-talking.webp"
															/>
															<div className="mb-2 mt-6 text-3xl font-semibold">
																{__(
																	'Transformation Solutions',
																	'extendify-local',
																)}
															</div>
															{__(
																'Unleash your potential with expert strategies for growth.',
																'extendify-local',
															)}
														</div>
														<div>
															<img
																alt={__(
																	'Two people and a laptop',
																	'extendify-local',
																)}
																className="h-auto w-full max-w-full"
																src="https://images.extendify-cdn.com/assist-tasks/design-library/two-person-and-laptop.webp"
															/>
															<div className="mb-2 mt-6 text-3xl font-semibold">
																{__('Accelerating Growth', 'extendify-local')}
															</div>
															{__(
																'Take your business to the next level with Growth Acceleration.',
																'extendify-local',
															)}
														</div>
													</div>
												</div>
												<div className="border-4 bg-white px-20 py-24">
													<div className="mb-4 text-5xl font-semibold">
														{__(
															'Frequently asked questions',
															'extendify-local',
														)}
													</div>
													<div className="w-2/4">
														{__(
															'Discover the solutions to your business challenges with our comprehensive consulting services. Explore our expertise in business strategy, organizational transformation, and growth acceleration.',
															'extendify-local',
														)}
													</div>
													<div className="mt-20 grid grid-cols-12 gap-14">
														<div className="col-span-5">
															{' '}
															<div className="mb-5 text-3xl font-semibold">
																{__(
																	'What is your consulting approach?',
																	'extendify-local',
																)}
															</div>
															{__(
																'Our collaborative approach helps us understand your challenges and goals. We analyze your business and develop a customized plan to achieve success. ',
																'extendify-local',
															)}
															<div className="mb-5 mt-12 text-3xl font-semibold">
																{__(
																	'What types of businesses do you work with?',
																	'extendify-local',
																)}
															</div>
															{__(
																'We help businesses succeed with tailored consulting services. From startups to established companies, our experts drive results.',
																'extendify-local',
															)}
														</div>
														<img
															alt={__('Man on a video call', 'extendify-local')}
															className="col-span-7 h-auto w-full max-w-full"
															src="https://images.extendify-cdn.com/assist-tasks/design-library/man-on-a-video-call.webp"
														/>
													</div>
												</div>
											</div>
											<div className="flex flex-col gap-8">
												<div className="border-4 bg-white px-20 py-24">
													<div className="mb-4 text-5xl font-semibold">
														{__('Testimonial', 'extendify-local')}
													</div>
													<div className="w-2/4">
														{__(
															'Discover our satisfied clients testimonials, showcasing our transformative impact.',
															'extendify-local',
														)}
													</div>
													<div className="mt-16 flex gap-8 bg-gray-100 p-12">
														<div className="w-7/12 pt-8">
															<Icon icon={quote} size={48} />

															<div className="mt-8 text-4xl font-medium">
																{__(
																	'Power Leap Consulting strategic recommendations drove growth and improved performance.',
																	'extendify-local',
																)}
															</div>
															<div className="mt-8 font-semibold">
																{__('Jessie Coleman', 'extendify-local')}
															</div>
															{__('President', 'extendify-local')}
														</div>
														<div className="w-5/12">
															<img
																alt={__(
																	'Portrait of Jessie Coleman',
																	'extendify-local',
																)}
																className="h-auto w-full max-w-full"
																src="https://images.extendify-cdn.com/assist-tasks/design-library/portrait-of-man.webp"
															/>
														</div>
													</div>

													<div className="mt-16 grid grid-cols-3 gap-8">
														<div className="flex-1 bg-gray-100 p-8">
															<Icon icon={quote} size={36} />

															<div className="mb-8 mt-4 font-medium">
																{__(
																	'Power Leap Consulting strategic recommendations drove growth and improved performance.',
																	'extendify-local',
																)}
															</div>

															<div className="flex items-start gap-3">
																<img
																	alt={__(
																		'Portrait of Jessie Coleman',
																		'extendify-local',
																	)}
																	className="h-auto max-h-10 w-full max-w-10 self-start rounded-full"
																	src="https://images.extendify-cdn.com/assist-tasks/design-library/portrait-of-girl.webp"
																/>
																<div className="flex-1">
																	<div className="font-semibold leading-none">
																		{__('Jessie Coleman', 'extendify-local')}
																	</div>
																	<div className="mt-1 text-sm text-gray-500">
																		{__('President', 'extendify-local')}
																	</div>
																</div>
															</div>
														</div>
														<div className="flex-1 bg-gray-100 p-8">
															<Icon icon={quote} size={36} />

															<div className="mb-8 mt-4 font-medium">
																{__(
																	'Power Leap Consulting strategic recommendations drove growth and improved performance.',
																	'extendify-local',
																)}
															</div>

															<div className="flex items-start gap-3">
																<img
																	alt={__(
																		'Portrait of Jessie Coleman',
																		'extendify-local',
																	)}
																	className="h-auto max-h-10 w-full max-w-10 self-start rounded-full"
																	src="https://images.extendify-cdn.com/assist-tasks/design-library/portrait-of-girl.webp"
																/>
																<div className="flex-1">
																	<div className="font-semibold leading-none">
																		{__('Jessie Coleman', 'extendify-local')}
																	</div>
																	<div className="mt-1 text-sm text-gray-500">
																		{__('President', 'extendify-local')}
																	</div>
																</div>
															</div>
														</div>
														<div className="flex-1 bg-gray-100 p-8">
															<Icon icon={quote} size={36} />

															<div className="mb-8 mt-4 font-medium">
																{__(
																	'Power Leap Consulting strategic recommendations drove growth and improved performance.',
																	'extendify-local',
																)}
															</div>

															<div className="flex items-start gap-3">
																<img
																	alt={__(
																		'Portrait of Jessie Coleman',
																		'extendify-local',
																	)}
																	className="h-auto max-h-10 w-full max-w-10 self-start rounded-full"
																	src="https://images.extendify-cdn.com/assist-tasks/design-library/portrait-of-girl.webp"
																/>
																<div className="flex-1">
																	<div className="font-semibold leading-none">
																		{__('Jessie Coleman', 'extendify-local')}
																	</div>
																	<div className="mt-1 text-sm text-gray-500">
																		{__('President', 'extendify-local')}
																	</div>
																</div>
															</div>
														</div>
													</div>
												</div>
												<div className="flex justify-center border-4 bg-white px-20 py-24">
													<div className="w-2/4 text-center">
														<div className="mb-4 text-5xl font-semibold">
															{__(
																'World class service offerings',
																'extendify-local',
															)}
														</div>
														{__(
															'Power Leap Consulting: Your trusted partner for business success. We specialize in strategic planning, transformation, and growth acceleration.',
															'extendify-local',
														)}
													</div>
												</div>
											</div>
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
}
