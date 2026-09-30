import { pageNames } from '@shared/lib/pages';
import { __ } from '@wordpress/i18n';
import { Icon, siteLogo } from '@wordpress/icons';

export const LaunchDemoSitesMarkup = (props) => (
	<div {...props}>
		<style>
			{`
			.extendify-assist .deme-real-estate * {
    			font-family: Verdana, Geneva, Tahoma, sans-serif !important;
       		}
			.extendify-assist .deme-site-education * {
				font-family: Georgia, "Times New Roman", Times, serif !important;
       		}
			.extendify-assist .deme-site-construction * {
  				font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
       		}
			.extendify-assist .deme-site-restaurant * {
  				  font-family: "Times New Roman", Times, serif !important;
       		}
			.extendify-assist .deme-site-cafe * {
       			font-family: "Courier New", Courier, monospace !important;
       		}
      		`}
		</style>
		<div className="relative flex justify-center text-left text-lg">
			<div className="deme-real-estate absolute z-50 w-fit origin-top scale-[0.13] transform">
				<div className="w-[1440px] overflow-hidden rounded-xl bg-white text-gray-800 shadow-xl">
					<div className="flex items-center justify-between px-20 py-6">
						<div className="flex items-center gap-2">
							<Icon icon={siteLogo} />
							<span>{__('Prime Estates', 'extendify-local')}</span>
						</div>
						<div className="flex gap-8">
							<span>{pageNames.about.title}</span>
							<span>{pageNames.blog.title}</span>
							<span>{pageNames.contact.title}</span>
						</div>
					</div>
					<div className="relative flex flex-col bg-black bg-[url('https://images.extendify-cdn.com/assist-tasks/demo-sites/real-estate-hero.webp')] bg-cover bg-center px-20 py-48 text-white">
						<div className="relative z-40 max-w-2xl">
							<h1 className="text-6xl font-medium text-white">
								{__(
									'Elevate Your Real Estate Experience with Pinnacle Properties',
									'extendify-local',
								)}
							</h1>
							<div className="mb-12 mt-4">
								{__(
									"Discover the key to Austin's vibrant real estate scene with Pinnacle Properties. Our seasoned agents leverage over two decades of industry know-how to guide you in finding your ideal home.",
									'extendify-local',
								)}
							</div>
							<div className="flex gap-4">
								<div className="w-fit rounded-full border bg-gray-900 px-6 py-3">
									{__('Contact Us', 'extendify-local')}
								</div>
								<div className="w-fit rounded-full border px-6 py-3">
									{__('Learn More', 'extendify-local')}
								</div>
							</div>
						</div>
						<div className="absolute inset-0 bg-black opacity-50"></div>
					</div>
					<div className="flex flex-col gap-16 px-20 py-24">
						<div className="flex max-w-full justify-center text-center">
							<div className="max-w-2xl">
								<h2 className="mb-4 text-4xl font-medium text-gray-900">
									{__(
										'Expert Real Estate Services in Austin',
										'extendify-local',
									)}
								</h2>
								<div>
									{__(
										'Find your dream home or make profitable investments with Pinnacle Properties, Austin premier real estate agency. Trust our experienced agents for personalized services.',
										'extendify-local',
									)}
								</div>
							</div>
						</div>
						<div className="grid grid-cols-3 gap-8">
							<div className="flex flex-col">
								<img
									alt={__('Real Estate Property', 'extendify-local')}
									src="https://images.extendify-cdn.com/assist-tasks/demo-sites/real-estate-1.webp"
									className="aspect-video object-cover object-center"
								/>
								<h3 className="mb-2 mt-6 text-xl font-semibold">
									{__('Buy Your Dream Home', 'extendify-local')}
								</h3>
								<div className="m-0">
									{__(
										'Find your dream home with our expert agents. We make homeownership a reality.',
										'extendify-local',
									)}
								</div>
							</div>
							<div className="flex flex-col">
								<img
									alt={__('Real Estate Property', 'extendify-local')}
									src="https://images.extendify-cdn.com/assist-tasks/demo-sites/real-estate-2.webp"
									className="aspect-video object-cover object-center"
								/>
								<h3 className="mb-2 mt-6 text-xl font-semibold">
									{__('Buy Your Dream Home', 'extendify-local')}
								</h3>
								<div className="m-0">
									{__(
										'Find your dream home with our expert agents. We make homeownership a reality.',
										'extendify-local',
									)}
								</div>
							</div>
							<div className="flex flex-col">
								<img
									alt={__('Real Estate Property', 'extendify-local')}
									src="https://images.extendify-cdn.com/assist-tasks/demo-sites/real-estate-3.webp"
									className="aspect-video object-cover object-center"
								/>
								<h3 className="mb-2 mt-6 text-xl font-semibold">
									{__('Buy Your Dream Home', 'extendify-local')}
								</h3>
								<div className="m-0">
									{__(
										'Find your dream home with our expert agents. We make homeownership a reality.',
										'extendify-local',
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="deme-site-education absolute right-44 top-10 z-40 w-40 origin-top scale-[0.1125] transform">
				<div className="w-[1440px] overflow-hidden rounded-xl bg-white text-gray-800 shadow-xl">
					<div className="flex items-center justify-between px-20 py-6">
						<div className="flex items-center gap-2">
							<Icon icon={siteLogo} />
							<span>{__('BrightFuture', 'extendify-local')}</span>
						</div>
						<div className="flex gap-8">
							<span>{pageNames.about.title}</span>
							<span>{pageNames.blog.title}</span>
							<span>{pageNames.contact.title}</span>
						</div>
					</div>

					<div className="relative grid grid-cols-12 flex-col content-end gap-20 bg-black bg-[url('https://images.extendify-cdn.com/assist-tasks/demo-sites/education-hero.webp')] bg-cover bg-center px-20 pb-24 pt-72 text-white">
						<h1 className="relative z-40 col-span-8 mt-0 text-6xl font-semibold text-white">
							{__(
								'Empowering Academic Excellence in Every Student for Tomorrow’s	Leaders',
								'extendify-local',
							)}
						</h1>
						<div className="relative z-40 col-span-4">
							<div className="mb-12 mt-4">
								{__(
									'Discover a transformative educational experience at American Academic Excellence High Schools, where students excel in STEM, arts, and humanities to become tomorrow’s leaders.',
									'extendify-local',
								)}
							</div>
							<div className="flex gap-4">
								<div className="w-fit rounded-full border bg-[#CAFF58] px-6 py-3 text-gray-900">
									{__('Apply Now', 'extendify-local')}
								</div>
							</div>
						</div>
						<div className="absolute inset-0 bg-black opacity-50"></div>
					</div>

					<div className="grid grid-cols-6 gap-16 px-20 py-24">
						<div className="col-span-2">
							<h2 className="mb-4 text-4xl font-semibold text-gray-900">
								{__('Our Commitment to Academic Excellence', 'extendify-local')}
							</h2>
							<div>
								{__(
									'American Academic Excellence High Schools: Shaping tomorrow’s leaders through top-tier education in Houston, Texas. STEM, arts, humanities. Well-rounded curriculum, exceptional educators.',
									'extendify-local',
								)}
							</div>
						</div>
						<div className="col-span-4 grid grid-cols-2 gap-8">
							<img
								alt={__('Education Website Image', 'extendify-local')}
								src="https://images.extendify-cdn.com/assist-tasks/demo-sites/education-1.webp"
								className="aspect-[2/4] max-w-full object-cover object-center"
							/>
							<img
								alt={__('Education Website Image', 'extendify-local')}
								src="https://images.extendify-cdn.com/assist-tasks/demo-sites/education-2.webp"
								className="aspect-[2/4] max-w-full object-cover object-center"
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="deme-site-cafe absolute right-28 top-28 z-10 w-40 origin-top scale-[0.1125] transform">
				<div className="w-[1440px] overflow-hidden rounded-xl bg-[#FEEBEA] text-[#9E1129] shadow-xl">
					<div className="flex items-center justify-between px-20 py-6">
						<div className="flex items-center gap-2">
							<Icon icon={siteLogo} />
							<span>{__('Brewed Bliss', 'extendify-local')}</span>
						</div>
						<div className="flex gap-8">
							<span>{pageNames.about.title}</span>
							<span>{pageNames.blog.title}</span>
							<span>{pageNames.contact.title}</span>
						</div>
					</div>
					<div className="flex flex-col gap-16 px-20 py-24">
						<div className="mx-auto max-w-4xl text-center">
							<h1 className="mb-4 mt-0 text-6xl font-semibold text-[#9E1129]">
								{__(
									'Embark on a delightful coffee adventure around the world.',
									'extendify-local',
								)}
							</h1>
						</div>
						<div className="grid grid-cols-2 gap-8">
							<div>
								<img
									alt={__('Cafe Website Image', 'extendify-local')}
									src="https://images.extendify-cdn.com/assist-tasks/demo-sites/cafe-1.webp"
									className="mb-8 aspect-video max-w-full object-cover object-center"
								/>
								<img
									alt={__('Cafe Website Image', 'extendify-local')}
									src="https://images.extendify-cdn.com/assist-tasks/demo-sites/cafe-2.webp"
									className="aspect-square max-w-full object-cover object-center"
								/>
							</div>
							<div>
								<img
									alt={__('Cafe Website Image', 'extendify-local')}
									src="https://images.extendify-cdn.com/assist-tasks/demo-sites/cafe-3.webp"
									className="mb-8 aspect-square max-w-full object-cover object-center"
								/>
								<img
									alt={__('Cafe Website Hero Image', 'extendify-local')}
									src="https://images.extendify-cdn.com/assist-tasks/demo-sites/cafe-4.webp"
									className="aspect-video max-w-full object-cover object-center"
								/>
							</div>
						</div>
						<div className="max-w-2xl">
							{__(
								'Find your dream home or make profitable investments with Pinnacle Properties, Austin’s premier real estate agency.',
								'extendify-local',
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="deme-site-construction absolute left-8 top-10 z-40 w-40 origin-top scale-[0.1125] transform">
				<div className="w-[1440px] overflow-hidden rounded-xl bg-[#DBD3CF] text-gray-800 shadow-xl">
					<div className="flex items-center justify-between px-20 py-6">
						<div className="flex items-center gap-2">
							<Icon icon={siteLogo} />
							<span>{__('Skyline Builders', 'extendify-local')}</span>
						</div>
						<div className="flex gap-8">
							<span>{pageNames.about.title}</span>
							<span>{pageNames.blog.title}</span>
							<span>{pageNames.contact.title}</span>
						</div>
					</div>
					<div className="grid h-full grid-cols-2">
						<div className="flex-1 px-20 py-28">
							<h1 className="mt-0 text-6xl font-semibold">
								{__(
									'Building Tomorrow’s Miami: Your Premier Construction Partner Today',
									'extendify-local',
								)}
							</h1>
							<div className="mb-12 mt-4">
								{__(
									'We bring your dreams to life with groundbreaking construction techniques, turning your vision into reality with innovative and sustainable solutions.',
									'extendify-local',
								)}
							</div>
							<div className="flex gap-4">
								<div className="w-fit border bg-gray-900 px-6 py-3 text-white">
									{__('Get a Quote', 'extendify-local')}
								</div>
							</div>
						</div>
						<div className="h-full">
							<img
								src="https://images.extendify-cdn.com/assist-tasks/demo-sites/construction-hero.webp"
								className="h-full w-full object-cover"
								alt="Construction Hero"
							/>
						</div>
					</div>
					<div className="flex flex-col gap-16 bg-[#C5B6AD] px-20 py-24">
						<div className="flex max-w-full justify-center text-center">
							<div className="max-w-2xl">
								<h2 className="mb-4 text-4xl font-semibold text-gray-900">
									{__(
										'About Superior Build Construction: Building Dreams, Delivering Excellence in Miami.',
										'extendify-local',
									)}
								</h2>
								<div>
									{__(
										"Superior Build Construction is a premier construction company based in Miami, Florida. With over 30 years of experience, we specialize in residential and commercial construction projects, offering end-to-end solutions. Our mission is to provide high-quality, durable constructions while ensuring the utmost client satisfaction, making us a trusted name in Miami's real estate industry.",
										'extendify-local',
									)}
								</div>
							</div>
						</div>
					</div>
					<div className="flex flex-col gap-16 px-20 py-24">
						<div className="flex max-w-full justify-center text-center">
							<div className="max-w-2xl">
								<h2 className="mb-4 text-4xl font-semibold text-gray-900">
									{__(
										'About Superior Build Construction: Building Dreams, Delivering Excellence in Miami.',
										'extendify-local',
									)}
								</h2>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="deme-site-restaurant absolute -left-8 top-28 z-10 w-40 origin-top scale-[0.1125] transform">
				<div className="w-[1440px] overflow-hidden rounded-xl bg-white text-gray-800 shadow-xl">
					<div className="flex items-center justify-between px-20 py-6">
						<div className="flex items-center gap-2">
							<Icon icon={siteLogo} />
							<span>{__('Urban Bistro', 'extendify-local')}</span>
						</div>
						<div className="flex gap-8">
							<span>{pageNames.about.title}</span>
							<span>{pageNames.blog.title}</span>
							<span>{pageNames.contact.title}</span>
						</div>
					</div>
					<div className="relative bg-black bg-[url('https://images.extendify-cdn.com/assist-tasks/demo-sites/restaurant-hero.webp')] bg-cover bg-center px-20 py-24 text-center text-white">
						<div className="relative z-40 mx-auto flex w-full max-w-4xl flex-col items-center justify-between">
							<h1 className="mt-0 text-center text-6xl font-semibold text-white">
								{__('French-Inspired Californian Cuisine', 'extendify-local')}
							</h1>
							<div className="mb-12 mt-4">
								{__(
									'Indulge in classic French bistro cuisine with a Californian twist at The Bistro House in San Francisco. Quality, sustainability, and Bay Area culinary traditions.',
									'extendify-local',
								)}
							</div>
							<div className="w-fit border bg-[#2A0552] px-6 py-3">
								{__('Contact Us', 'extendify-local')}
							</div>
						</div>
						<div className="absolute inset-0 z-10 bg-black opacity-50"></div>
					</div>
					<div className="flex flex-col gap-16 bg-[#F0EDE5] px-20 py-24">
						<div className="max-w-2xl">
							{__(
								"Find your dream home or make profitable investments with Pinnacle Properties, Austin's premier real estate agency. Trust our experienced agents for personalized services.",
								'extendify-local',
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
);
