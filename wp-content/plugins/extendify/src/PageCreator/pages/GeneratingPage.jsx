import { updateOption } from '@page-creator/api/WPApi';
import { VideoPlayer } from '@page-creator/components/content/VideoPlayer';
import { usePageCustomContent } from '@page-creator/hooks/usePageCustomContent';
import { processPatterns } from '@page-creator/lib/processPatterns';
import { useGlobalsStore } from '@page-creator/state/global';
import { installBlocks } from '@page-creator/util/installBlocks';
import { syncPageTitleTemplate } from '@page-creator/util/syncPageTitleTemplate';
import { rawHandler } from '@wordpress/blocks';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const { pageTitlePattern } = window.extPageCreator;

export const GeneratingPage = ({ insertPage }) => {
	const { page, loading } = usePageCustomContent();
	const { progress, setProgress } = useGlobalsStore();
	const { editPost } = useDispatch(editorStore);
	const [patterns, setPatterns] = useState([]);
	const once = useRef(false);
	const templateSet = useRef(false);
	const { theme, templates } = useSelect((select) => {
		const core = select('core');
		const current = core.getCurrentTheme();

		return {
			theme: current,
			templates: core.getEntityRecords('postType', 'wp_template', {
				per_page: -1,
				context: 'edit',
				theme: current?.stylesheet,
			}),
		};
	}, []);

	useEffect(() => {
		if (!page && loading) return;
		if (once.current) return;
		once.current = true;

		setProgress(
			__(
				'Processing patterns and installing required plugins...',
				'extendify-local',
			),
		);
		(async () => {
			// If page-with-title template isn’t customized and a page-title pattern is stashed, update the template with it.
			await syncPageTitleTemplate(pageTitlePattern);

			const patterns = await processPatterns(page?.patterns);
			await installBlocks({ patterns });
			setPatterns(patterns);
		})();
	}, [loading, page, setPatterns, setProgress]);

	useEffect(() => {
		if (!patterns?.length || !once.current) return;
		if (!theme || !Array.isArray(templates)) return;

		const isExtendable = theme.textdomain === 'extendable';
		const hasPageWithTitle =
			isExtendable && templates.some((t) => t.slug === 'page-with-title');

		const patternsToInsert = hasPageWithTitle
			? patterns.filter((p) => !p.patternTypes?.includes('page-title'))
			: patterns;

		const code = patternsToInsert.flatMap(({ code }) => {
			// find links with #extendify- like href="#extendify-hero-cta"
			const linksRegex = /href="#extendify-([^"]+)"/g;
			const c = code.replaceAll(linksRegex, 'href="#"');

			return rawHandler({ HTML: c });
		});

		if (!templateSet.current && isExtendable) {
			const slug = hasPageWithTitle ? 'page-with-title' : 'no-title';
			editPost({ template: slug }).catch(() => {
				/* silent */
			});
			templateSet.current = true;
		}

		// Signal to the importer to check for images
		updateOption('extendify_check_for_image_imports', true);

		const id = setTimeout(() => insertPage(code, page.title), 1000);

		return () => clearTimeout(id);
	}, [insertPage, patterns, editPost, page, theme, templates]);

	return (
		<div className="mx-auto flex grow items-center justify-center">
			<div className="mx-auto flex h-full flex-col justify-center">
				<VideoPlayer
					poster={`${window.extSharedData.assetPath}/site-building.webp`}
					path="https://images.extendify-cdn.com/launch/site-building.webm"
					className="mx-auto h-auto w-50 md:w-100"
				/>
				{progress && (
					<p className="text-center text-lg" aria-live="polite">
						{progress}
					</p>
				)}
			</div>
		</div>
	);
};
