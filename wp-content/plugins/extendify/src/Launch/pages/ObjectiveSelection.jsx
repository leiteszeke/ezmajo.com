import { useUserSelectionStore } from '@launch//state/user-selections';
import { Title } from '@launch/components/Title';
import { PageLayout } from '@launch/layouts/PageLayout';
import { pageState } from '@launch/state/factory';
import { usePagesStore } from '@launch/state/Pages';
import {
	Blog,
	Business,
	ECommerce,
	LandingPage,
	OtherSiteTypes,
} from '@launch/svg';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import classNames from 'classnames';

export const state = pageState('Website Objective', () => ({
	ready: false,
	canSkip: false,
	useNav: true,
	onRemove: () => {},
}));

const sections = [
	{
		title: __('Business', 'extendify-local'),
		slug: 'business',
		icon: <Business />,
	},
	{
		title: __('eCommerce', 'extendify-local'),
		slug: 'ecommerce',
		icon: <ECommerce />,
	},
	{
		title: __('Blog', 'extendify-local'),
		slug: 'blog',
		icon: <Blog />,
	},
	{
		title: __('Landing Page', 'extendify-local'),
		slug: 'landing-page',
		icon: <LandingPage />,
	},
	{
		title: __('Other', 'extendify-local'),
		slug: 'other',
		icon: <OtherSiteTypes />,
	},
];

export const ObjectiveSelection = () => {
	const { siteObjective, siteStructure, setSiteObjective, setSiteStructure } =
		useUserSelectionStore();

	const { nextPage } = usePagesStore();

	const handleClick = (slug) => {
		setSiteObjective(slug);
		// Add a small delay before page transition to ensure state updates
		// (particularly siteStructure) are fully processed and synchronized
		// before navigating to the next step in the site creation flow.
		setTimeout(nextPage, 5);
	};

	useEffect(() => {
		if (siteObjective === 'landing-page') {
			setSiteStructure('single-page');
		}
	}, [siteObjective, setSiteStructure, siteStructure]);

	useEffect(() => {
		state.setState({ ready: !!siteObjective });
	}, [siteObjective]);

	return (
		<PageLayout>
			<div className="mx-auto grow overflow-y-auto px-6 py-8 md:p-12 3xl:p-16">
				<div className="mx-auto flex h-full flex-col justify-center">
					<Title
						title={__(
							'What type of website are you creating?',
							'extendify-local',
						)}
					/>
					<div className="grid grid-cols-2 gap-6 md:grid-cols-3 md:gap-8 lg:grid-cols-5">
						{sections.map(({ icon, slug, title }) => (
							<ButtonSelect
								icon={icon}
								key={slug}
								title={title}
								slug={slug}
								onClick={() => handleClick(slug)}
								selected={siteObjective === slug}
							/>
						))}
					</div>
				</div>
			</div>
		</PageLayout>
	);
};

const ButtonSelect = ({ title, onClick, selected, icon, slug }) => (
	// biome-ignore lint: keep the radio role until a refactor is done
	<div
		data-test={`site-template-type-${slug}`}
		className={classNames(
			'relative flex-1 cursor-pointer overflow-hidden rounded-smring-offset-2 ring-offset-white focus-within:outline-hidden focus-within:ring-4 focus-within:ring-design-main focus-within:ring-offset-2 focus-within:ring-offset-white hover:outline-hidden hover:ring-4',
			{
				'ring-4 ring-design-main ring-offset-2 ring-offset-white hover:ring-design-main':
					selected,
				'hover:ring-gray-300': !selected,
			},
		)}
		role="radio"
		tabIndex={0}
		aria-label={__('Press to select', 'extendify-local')}
		aria-checked={selected}
		onKeyDown={(e) => {
			if (!['Enter', 'Space', ' '].includes(e.key)) return;
			e.preventDefault();
			onClick();
		}}
		onClick={onClick}
	>
		<div className="flex h-fit flex-col items-center rounded-sm border border-gray-200">
			<div className="flex w-full items-center justify-center bg-gray-100 px-8 py-6 md:px-14 md:py-8">
				<Icon icon={icon} size="48" />
			</div>
			<div className="flex items-center justify-center px-px py-3 text-base font-medium text-gray-900">
				{title}
			</div>
		</div>
	</div>
);
