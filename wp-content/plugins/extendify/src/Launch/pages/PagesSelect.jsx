import { getPageTemplates } from '@launch/api/DataApi';
import { PagePreview } from '@launch/components/PagePreview';
import { PageSelectButton } from '@launch/components/PageSelectButton';
import { PageSelectButtonPlaceholder } from '@launch/components/PageSelectButtonPlaceholder';
import { ShoppingCart } from '@launch/components/QuestionIcon/Icons/shopping-cart';
import { Title } from '@launch/components/Title';
import { useFetch } from '@launch/hooks/useFetch';
import { PageLayout } from '@launch/layouts/PageLayout';
import { pageState } from '@launch/state/factory';
import { usePagesSelectionStore } from '@launch/state/pages-selections';
import { useUserSelectionStore } from '@launch/state/user-selections';
import { buildRecommendedPagesParams } from '@launch/utils/buildRecommendedPagesParams';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export const state = pageState('Pages', () => ({
	ready: true,
	canSkip: false,
	useNav: true,
	onRemove: () => {
		// If the page is removed then clean up the selected pages
		const { pages, remove } = usePagesSelectionStore.getState();
		pages.forEach((page) => {
			remove('pages', page);
		});
	},
}));

export const PagesSelect = () => {
	const {
		data: availablePages,
		loading,
		error,
	} = useFetch(buildRecommendedPagesParams, getPageTemplates);
	const [previewing, setPreviewing] = useState();
	const [expandMore, setExpandMore] = useState();
	const { siteInformation, siteObjective, siteQA } = useUserSelectionStore();
	const { pages, remove, removeAll, add, has, style } =
		usePagesSelectionStore();
	const pagePreviewRef = useRef();

	useEffect(() => {
		state.setState({ ready: !loading && !error });
	}, [loading, error]);

	const homePage = useMemo(
		() => ({
			id: 'home-page',
			slug: 'home-page',
			name: __('Home page', 'extendify-local'),
			patterns: style?.patterns
				.flatMap(({ code }) => code)
				.map((code, i) => ({
					name: `pattern-${i}`,
					code,
				})),
		}),
		[style],
	);
	const styleMemo = useMemo(
		() => ({ ...style, patterns: previewing?.patterns || [] }),
		[style, previewing],
	);

	const handlePageToggle = (page) => {
		if (has('pages', page)) {
			remove('pages', page);
			return;
		}
		add('pages', page);
		return setPreviewing(page);
	};

	useEffect(() => {
		// This needs two frames before the code is rendered
		let raf2;
		const id = requestAnimationFrame(() => {
			raf2 = requestAnimationFrame(() => {
				pagePreviewRef?.current?.scrollTo(0, 0);
			});
		});
		return () => {
			cancelAnimationFrame(id);
			cancelAnimationFrame(raf2);
		};
	}, [previewing]);

	useEffect(() => {
		if (previewing) return;
		setPreviewing(homePage);
	}, [previewing, homePage]);

	useEffect(() => {
		if (!availablePages?.recommended) return;
		// On re-load, remove any lingering pages and add the recommended ones
		removeAll('pages');
		availablePages.recommended.forEach((page) => {
			add('pages', page);
		});
	}, [availablePages?.recommended, removeAll, add]);

	const productsQuestion = siteQA?.questions?.find((q) => q.id === 'products');
	const productsAnswer =
		productsQuestion?.answerUser ?? productsQuestion?.answerAI;

	return (
		<PageLayout>
			<div className="grow space-y-4 overflow-y-auto lg:flex lg:space-y-0">
				<div className="lg:px-16 hidden h-full min-h-screen grow overflow-y-hidden bg-gray-100 px-4 pt-0 lg:block lg:min-h-0 lg:pb-0 xl:px-32">
					<div className="flex h-full flex-col">
						<h3 className="my-2 text-center text-base font-medium text-gray-700 lg:my-4 lg:text-lg">
							{previewing?.name}
						</h3>
						<div
							ref={pagePreviewRef}
							className="relative h-full grow overflow-x-hidden rounded-t-lg lg:h-auto lg:overflow-y-auto"
						>
							{previewing && (
								<PagePreview
									ref={pagePreviewRef}
									showNav={siteObjective !== 'landing-page'}
									style={styleMemo}
									siteTitle={siteInformation.title}
									loading={loading}
								/>
							)}
						</div>
					</div>
				</div>
				<div className="flex w-full flex-col items-center overflow-y-auto px-6 py-8 lg:max-w-lg lg:px-12">
					<Title
						title={__(
							'Pick the pages to add to your website',
							'extendify-local',
						)}
						description={__(
							'We already selected the most common pages for your type of website.',
							'extendify-local',
						)}
					/>
					<div
						className="flex w-full flex-col gap-4 pb-4"
						data-test="recommended-pages"
					>
						<PageSelectButton
							page={homePage}
							previewing={homePage.id === previewing?.id}
							onPreview={() => setPreviewing(homePage)}
							checked={true}
							forceChecked={true}
							onChange={() => undefined}
						/>
						{!loading &&
							!error &&
							availablePages?.recommended?.map((page) => (
								<PageSelectButton
									key={page.id}
									page={page}
									previewing={page.id === previewing?.id}
									onPreview={() => setPreviewing(page)}
									checked={has('pages', page)}
									onChange={() => handlePageToggle(page)}
								/>
							))}
						{(loading || error) &&
							Array.from({ length: 5 }, (_, index) => (
								<PageSelectButtonPlaceholder key={index} />
							))}
					</div>

					{!loading && !expandMore && (
						<div className="flex items-center justify-center">
							<button
								type="button"
								data-test="expand-more"
								onClick={setExpandMore}
								className="button-focus my-4 bg-transparent text-center text-sm font-medium text-gray-900 hover:text-design-main"
							>
								{__('View more pages', 'extendify-local')}
							</button>
						</div>
					)}

					{expandMore && (
						<div
							className="flex w-full flex-col gap-4 pb-4"
							data-test="optional-pages"
						>
							{availablePages?.optional?.map((page) => (
								<PageSelectButton
									key={page.id}
									page={page}
									previewing={page.id === previewing?.id}
									onPreview={() => setPreviewing(page)}
									checked={pages?.some((p) => p.id === page.id)}
									onChange={() => handlePageToggle(page)}
								/>
							))}
						</div>
					)}

					{!loading && productsAnswer === 'yes-shopping-cart' && (
						<div className="flex gap-1.5 mt-7 mx-auto w-full rounded-sm inset-ring inset-ring-gray-900/8 bg-gray-900/2 px-3.5 py-3 text-sm">
							<ShoppingCart />
							<span>
								{__(
									'A "Shop" page will also be automatically created.',
									'extendify-local',
								)}
							</span>
						</div>
					)}
				</div>
			</div>
		</PageLayout>
	);
};
