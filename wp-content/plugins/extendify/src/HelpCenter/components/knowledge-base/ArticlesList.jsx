import { useRouter } from '@help-center/hooks/useRouter';
import { useKnowledgeBaseStore } from '@help-center/state/knowledge-base.js';
import { isRTL } from '@wordpress/i18n';
import { Icon, redo, undo } from '@wordpress/icons';

export const ArticlesList = ({ articles }) => {
	const { pushArticle } = useKnowledgeBaseStore();
	const { navigateTo } = useRouter();

	return (
		<ul
			className="m-0 flex flex-col gap-1 py-2"
			data-test="help-center-kb-articles-list"
		>
			{articles.map(({ slug, title }) => (
				<li key={slug} className="m-0 py-1 pl-2 pr-3">
					<button
						type="button"
						className="flex gap-2 bg-transparent text-sm text-gray-800 hover:underline hover:underline-offset-4"
						onClick={() => {
							pushArticle({ slug, title });
							navigateTo('knowledge-base-article');
						}}
					>
						<Icon
							size={20}
							icon={isRTL() ? redo : undo}
							className="rotate-180 transform fill-gray-700"
						/>
						{title}
					</button>
				</li>
			))}
		</ul>
	);
};
