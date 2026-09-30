import { Article } from '@help-center/components/knowledge-base/Article';
import { ArticlesList } from '@help-center/components/knowledge-base/ArticlesList';
import { SearchForm } from '@help-center/components/knowledge-base/SearchForm';
import { useSearchArticles } from '@help-center/hooks/useSearchArticles';
import { useKnowledgeBaseStore } from '@help-center/state/knowledge-base';
import { safeParseJson } from '@shared/lib/parsing';
import { Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const mainArticles = [
	'wordpress-block-editor',
	'blocks-list',
	'adding-a-new-block',
	'block-pattern',
	'block-pattern-directory',
];

const allArticles = safeParseJson(
	window.extSharedData.resourceData,
)?.supportArticles?.filter((article) => mainArticles.includes(article.slug));

export const KnowledgeBaseDashboard = ({ onOpen }) => {
	const { setSearchTerm } = useKnowledgeBaseStore();
	return (
		<section className="rounded-md border" data-test="help-center-kb-section">
			<div className="border-b border-gray-150 bg-gray-100 p-2.5 pb-4">
				<h1 className="m-0 mb-3 p-0 text-lg font-medium">
					{__('Knowledge Base', 'extendify-local')}
				</h1>
				<SearchForm
					onChange={(term) => {
						setSearchTerm(term);
						onOpen();
					}}
				/>
			</div>
			<ArticlesList articles={allArticles.slice(0, 5)} />
		</section>
	);
};

export const KnowledgeBase = () => {
	const { setSearchTerm, searchTerm } = useKnowledgeBaseStore();
	const { data, loading } = useSearchArticles(searchTerm);

	return (
		<section className="p-4">
			<div className="">
				<div className="mb-4">
					<h2 className="m-0 mb-2 text-sm">
						{searchTerm && loading
							? __('Searching...', 'extendify-local')
							: data?.length > 0
								? __('Search results', 'extendify-local')
								: __('Search the knowledge base', 'extendify-local')}
					</h2>
					<SearchForm onChange={setSearchTerm} />
				</div>
				{loading && searchTerm ? (
					<div className="p-8 text-center text-base">
						<Spinner />
					</div>
				) : (
					<ArticlesList articles={data?.slice(0, 10) ?? []} />
				)}
			</div>
		</section>
	);
};

export const KnowledgeBaseArticle = () => (
	<section className="p-4">
		<div className="">
			<div className="">
				<Article />
			</div>
		</div>
	</section>
);

export const routes = [
	{
		slug: 'knowledge-base',
		title: __('Knowledge Base', 'extendify-local'),
		component: KnowledgeBase,
	},
	{
		slug: 'knowledge-base-article',
		title: __('Knowledge Base', 'extendify-local'),
		component: KnowledgeBaseArticle,
	},
];
