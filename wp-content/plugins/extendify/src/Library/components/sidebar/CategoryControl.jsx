import { useCategories } from '@library/hooks/useCategories';
import { useCacheStore } from '@library/state/cache';
import { useSiteSettingsStore } from '@library/state/site';
import { PanelBody, PanelRow, Spinner } from '@wordpress/components';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import classNames from 'classnames';

export const CategoryControl = () => {
	const { category, setCategory } = useSiteSettingsStore();
	const { data, isLoading, errorCount } = useCategories();
	const { categories, setCategories } = useCacheStore();

	useEffect(() => {
		if (isLoading || errorCount) return;
		setCategories(data);
	}, [data, isLoading, setCategories, errorCount]);

	useEffect(() => {
		if (!categories?.length || category) return;
		setCategory('all');
	}, [category, setCategory, categories]);

	return (
		<PanelBody
			title={__('Design Type', 'extendify-local')}
			className="ext-type-control p-0 border-0 [&_.components-panel\_\_body-title]:-mx-5 [&_.components-panel\_\_body-title]:mt-0 [&_.components-panel\_\_body-title]:mb-0.5"
			initialOpen={true}
		>
			<PanelRow>
				<CategoryList
					categories={categories}
					errorCount={errorCount}
					current={category}
					setCurrent={setCategory}
				/>
			</PanelRow>
		</PanelBody>
	);
};

const CategoryList = ({ categories, errorCount, current, setCurrent }) => {
	const classes = (slug) =>
		classNames(
			'text-sm w-full text-left rtl:text-right px-3 py-1 mb-0.5 block rounded',
			{
				'bg-design-main text-design-text': current === slug,
				'bg-transparent text-gray-900 hover:bg-gray-100': current !== slug,
			},
		);
	// If we have categories, return early no matter the error
	if (categories?.length) {
		return (
			<ul className="m-0 -mt-1.5 max-h-half w-full overflow-y-auto rounded-b border border-gray-300 px-1 py-2">
				<li className="m-0 p-0">
					<button
						type="button"
						id="extendify-library-category-all"
						onClick={() => setCurrent('all')}
						className={classes('all')}
					>
						{__('All', 'extendify-local')}
					</button>
				</li>
				{categories.map(({ slug, id, name }) => {
					return (
						<li key={id} className="m-0 p-0">
							<button
								type="button"
								id={`extendify-library-category-${slug}`}
								onClick={() => setCurrent(slug)}
								className={classes(slug)}
							>
								{name}
							</button>
						</li>
					);
				})}
			</ul>
		);
	}

	if (errorCount > 1) {
		return (
			<div className="-mt-1 flex w-full flex-col items-center justify-center gap-2 border-t border-gray-300 p-2">
				<span>{__('Retrying...', 'extendify-local')}</span>
				<Spinner />
			</div>
		);
	}

	return (
		<div className="-mt-1 flex w-full justify-center border-t border-gray-300 p-2">
			<span className="sr-only">{__('Fetching...', 'extendify-local')}</span>
			<Spinner />
		</div>
	);
};
