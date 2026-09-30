import { Title } from '@launch/components/Title';
import { PageLayout } from '@launch/layouts/PageLayout';
import { pageState } from '@launch/state/factory';
import { useUserSelectionStore } from '@launch/state/user-selections';
import {
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { __, isRTL } from '@wordpress/i18n';
import { arrowLeft, arrowRight, Icon } from '@wordpress/icons';
import classNames from 'classnames';

export const state = pageState('Site Template Type', () => ({
	ready: false,
	canSkip: false,
	useNav: true,
	onRemove: () => {},
}));

export const SiteStructure = () => {
	const { siteStructure, setSiteStructure } = useUserSelectionStore();
	const [firstButton, setFirstButton] = useState(siteStructure);

	useLayoutEffect(() => {
		if (firstButton || siteStructure) return;
		// Randomize the order of the buttons
		const random = ['single-page', 'multi-page'].sort(
			() => Math.random() - 0.5,
		);
		setFirstButton(random[0]);
		setSiteStructure(random[0]);
	}, [setSiteStructure, firstButton, siteStructure]);

	useEffect(() => {
		state.setState({ ready: !!siteStructure && firstButton });
	}, [siteStructure, firstButton]);

	const buttons = useMemo(
		() => [
			<ButtonSelect
				key="single-page"
				onClick={() => setSiteStructure('single-page')}
				selected={siteStructure === 'single-page'}
				imageSrc="https://images.extendify-cdn.com/launch/single-page-website.webp"
				title={__('Single-Page Website', 'extendify-local')}
				description={__(
					'All content displayed on one scrolling page.',
					'extendify-local',
				)}
			/>,
			<ButtonSelect
				key="multi-page"
				onClick={() => setSiteStructure('multi-page')}
				selected={siteStructure === 'multi-page'}
				imageSrc="https://images.extendify-cdn.com/launch/multi-page-website.webp"
				title={__('Multi-Page Website', 'extendify-local')}
				description={__('Multiple interconnected pages.', 'extendify-local')}
			/>,
		],
		[siteStructure, setSiteStructure],
	);
	const buttonsOrdered =
		firstButton === 'multi-page' ? buttons.toReversed() : buttons;

	return (
		<PageLayout>
			<div className="grow overflow-y-auto px-6 py-8 md:p-12 3xl:p-16">
				<Title title={__('Pick Your Site Structure', 'extendify-local')} />
				<div className="relative mx-auto flex w-full max-w-2xl flex-col gap-8 lg:flex-row 3xl:max-w-4xl">
					{buttonsOrdered}
				</div>
			</div>
		</PageLayout>
	);
};

const ButtonSelect = ({ title, description, onClick, selected, imageSrc }) => (
	// biome-ignore lint: keep the button role until a refactor is done
	<div
		data-test="site-template-type"
		className={classNames(
			'relative flex-1 cursor-pointer overflow-hidden rounded-sm border border-gray-200 ring-offset-2 ring-offset-white focus-within:outline-hidden focus-within:ring-4 focus-within:ring-design-main focus-within:ring-offset-2 focus-within:ring-offset-white hover:outline-hidden hover:ring-4',
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
		<div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 group-hover:opacity-75 lg:flex">
			<img
				alt=""
				src={imageSrc}
				className="absolute inset-0 h-full w-full object-cover"
			/>
		</div>
		<div className="p-4 lg:p-6">
			<p className="m-0 mb-3 p-0 text-gray-700 3xl:mb-4">{description}</p>
			<div className="flex items-center justify-between">
				<h1 className="m-0 p-0 text-lg font-semibold">{title}</h1>
				<Icon icon={isRTL() ? arrowLeft : arrowRight} />
			</div>
		</div>
	</div>
);
