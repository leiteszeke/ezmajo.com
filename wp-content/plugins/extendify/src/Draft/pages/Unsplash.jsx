import { addImageToBlock } from '@draft/api/WPApi';
import { UnsplashImages } from '@draft/components/stock-images/UnsplashImages';
import { useRouter } from '@draft/hooks/useRouter';
import { useUnsplashImages } from '@draft/hooks/useUnsplashImages';
import { backArrow } from '@draft/svg/BackArrow';
import { downloadImage } from '@shared/api/wp';
import { store as blockEditorStore } from '@wordpress/block-editor';
import {
	__experimentalDivider as Divider,
	__experimentalHeading as Heading,
	SearchControl,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import classNames from 'classnames';

export const Unsplash = () => {
	const { goBack } = useRouter();
	const [search, setSearch] = useState('');
	const [searchDebounced, setSearchDebounced] = useState('');
	const [searching, setSearching] = useState(false);
	const { data: images, loading } = useUnsplashImages(searchDebounced, 'user');
	const [isInsertingImage, setIsInsertingImage] = useState(null);

	const selectedBlock = useSelect(
		(select) => select(blockEditorStore).getSelectedBlock(),
		[],
	);
	const { updateBlockAttributes } = useDispatch(blockEditorStore);

	const handleClick = async (image) => {
		if (isInsertingImage) return;
		setIsInsertingImage(image);
		try {
			const downloadedImage = await downloadImage(
				image.requestMetadata?.id,
				image.urls?.regular,
				'unsplash',
				image.id,
			);
			addImageToBlock(selectedBlock, downloadedImage, updateBlockAttributes);
		} catch (error) {
			console.error(error);
		} finally {
			setIsInsertingImage(null);
		}
	};

	useEffect(() => {
		setSearching(false);
	}, [searchDebounced]);

	useEffect(() => {
		if (!search) return setSearchDebounced('');
		const id = setTimeout(() => setSearchDebounced(search), 750);
		return () => clearTimeout(id);
	}, [search]);

	return (
		<>
			<div className="flex h-12 items-center gap-1 pl-1">
				<button
					className="h-9 w-9 border-0 bg-transparent"
					onClick={goBack}
					type="button"
					aria-label={__('Go Back', 'extendify-local')}
				>
					{backArrow}
				</button>
				<Heading className="mb-0">
					{__('Photos from Unsplash', 'extendify-local')}
				</Heading>
			</div>
			<Divider className="my-0 border-gray-150" />
			<div className="flex flex-col gap-2 p-4">
				<SearchControl
					autoFocus
					// This wp component has no real disabled state
					className={classNames({
						'pointer-events-none bg-gray-150 opacity-50': isInsertingImage,
					})}
					disabled={isInsertingImage}
					aria-disabled={isInsertingImage}
					onChange={(value) => {
						if (isInsertingImage) return;
						setSearch(value);
					}}
					value={search}
				/>
				<UnsplashImages
					images={images}
					isInsertingImage={isInsertingImage}
					onClick={handleClick}
					loading={loading || searching}
				/>
			</div>
		</>
	);
};

export const routes = [
	{
		slug: 'unsplash',
		title: __('Unsplash', 'extendify-local'),
		component: Unsplash,
	},
];
