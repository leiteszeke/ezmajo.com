import { BlockPreviewButton } from '@library/components/BlockPreviewButton';
import { usePatterns } from '@library/hooks/usePatterns';
import { useSiteImages } from '@library/hooks/useSiteImages';
import { replacePatternImages } from '@library/util/replace-pattern-images';
import { Spinner } from '@wordpress/components';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useInView } from 'react-intersection-observer';
import Masonry from 'react-masonry-css';

export const ModalContent = ({ insertPattern, category }) => {
	const { data, isLoading, setSize } = usePatterns({
		category,
	});
	const { siteImages } = useSiteImages();
	const sessionSeed = useMemo(() => Math.random().toString(36), []);
	const [showLoading, setShowLoading] = useState(true);
	const [loadMoreRef, inView] = useInView();
	const noMore = data?.at(-1)?.length < 9; // hard coded for now

	useEffect(() => {
		if (isLoading) {
			return setShowLoading(true);
		}
		const id = setTimeout(() => {
			setShowLoading(false);
		}, 750);
		return () => clearTimeout(id);
	}, [isLoading]);

	useEffect(() => {
		if (!inView || isLoading) return;
		setSize((size) => size + 1);
	}, [inView, isLoading, setSize]);

	if (isLoading || !data?.length) {
		return (
			<div className="absolute inset-0 flex flex-col items-center justify-center text-center">
				<Spinner />
				<span className="sr-only">
					{__('Loading Patterns...', 'extendify-local')}
				</span>
			</div>
		);
	}

	return (
		<>
			<Masonry
				breakpointCols={{
					default: 3,
					1600: 2,
					1000: 1,
					783: 2,
					600: 1,
				}}
				columnClassName=""
				className="relative flex w-full gap-6 p-8 pt-2"
			>
				{data.map((p) =>
					p.map(({ id, code, patternReplacementCode }) => (
						<BlockPreviewButton
							key={id}
							insertPattern={insertPattern}
							code={replacePatternImages(
								patternReplacementCode ?? code,
								siteImages,
								`${id}-${sessionSeed}`,
							)}
						/>
					)),
				)}
			</Masonry>
			{showLoading ? (
				<div className="absolute inset-0 flex flex-col items-center justify-center text-center">
					<Spinner />
					<span className="sr-only">
						{__('Loading Patterns...', 'extendify-local')}
					</span>
				</div>
			) : null}
			{showLoading || noMore ? null : (
				<div
					ref={loadMoreRef}
					className="mb-6 mt-6 flex w-full justify-center md:mt-2"
				>
					<Spinner />
					<span className="sr-only">
						{__('Loading more patterns...', 'extendify-local')}
					</span>
				</div>
			)}
		</>
	);
};
