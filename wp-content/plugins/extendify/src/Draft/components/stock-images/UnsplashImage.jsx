import { loadImage } from '@shared/api/wp';
import { Spinner } from '@wordpress/components';
import { useEffect, useInsertionEffect, useState } from '@wordpress/element';
import classNames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';

export const UnsplashImage = ({
	image,
	skeletonHeight,
	isInsertingImage,
	onClick,
}) => {
	const [authorUrl, setAuthorUrl] = useState('');
	const [loaded, setLoaded] = useState(false);
	const aspectRatio = image?.width
		? Number(image?.width) / Number(image?.height)
		: 122 / skeletonHeight;

	useEffect(() => {
		if (!image?.user?.links?.html) {
			setAuthorUrl('');
			return;
		}
		const authorUrl = new URL(image.user.links.html);
		authorUrl.searchParams.set('utm_source', 'extendify');
		authorUrl.searchParams.set('utm_medium', 'referral');
		setAuthorUrl(authorUrl.toString());
	}, [image]);

	useInsertionEffect(() => {
		if (!image?.urls || loaded) return;
		const img = new Image();
		img.src = image.urls.thumb || image.urls.small;
		loadImage(img).then(() => setLoaded(true));
	}, [image, loaded]);

	return (
		<motion.div
			className="relative mb-1"
			initial={{ aspectRatio }}
			animate={{ aspectRatio }}
		>
			<AnimatePresence>
				{loaded ? null : (
					<motion.div
						className="absolute inset-0 z-10 bg-white"
						initial={{ opacity: 1 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<div className="animate-pulse absolute inset-0 z-10 bg-gray-150" />
					</motion.div>
				)}
			</AnimatePresence>
			<div className="group relative">
				<button
					type="button"
					className={classNames('relative block border-0 p-0', {
						'bg-transparent': !isInsertingImage,
						'bg-black': isInsertingImage,
					})}
					onClick={() => onClick(image)}
					disabled={isInsertingImage}
				>
					{isInsertingImage && isInsertingImage?.id === image?.id && (
						<div className="absolute inset-0 flex items-center justify-center">
							<Spinner style={{ height: '24px', width: '24px' }} />
						</div>
					)}
					<img
						src={image?.urls?.thumb || image?.urls?.small}
						className={classNames('block transition-opacity duration-300', {
							'opacity-50': isInsertingImage,
						})}
						alt={image?.alt_description}
					/>
				</button>
				{image?.user?.name && authorUrl ? (
					<a
						href={authorUrl}
						target="_blank"
						className={classNames(
							'absolute bottom-1 bg-black/70 px-1 text-white no-underline opacity-0',
							{
								'group-focus-within:opacity-100 group-hover:opacity-100':
									!isInsertingImage,
							},
						)}
					>{`${image.user?.name}`}</a>
				) : null}
			</div>
		</motion.div>
	);
};
