import { getMediaDetails } from '@assist/lib/media';
import { useGlobalStore } from '@assist/state/globals';
import apiFetch from '@wordpress/api-fetch';
import { isBlobURL } from '@wordpress/blob';
import {
	Button,
	DropZone,
	ResponsiveWrapper,
	Spinner,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { MediaUpload, uploadMedia } from '@wordpress/media-utils';

export const ImageUploader = ({ type, onUpdate, title, actionLabel }) => {
	const { popModal } = useGlobalStore();
	const [isLoading, setIsLoading] = useState(false);
	const [imageId, setImageId] = useState(0);
	const media = useSelect(
		(select) =>
			select(coreStore).getEntityRecord('postType', 'attachment', imageId),
		[imageId],
	);
	const { mediaWidth, mediaHeight, mediaSourceUrl } = getMediaDetails(media);

	useEffect(() => {
		const controller = new AbortController();

		apiFetch({
			path: '/wp/v2/settings',
			signal: controller.signal,
		}).then((settings) => {
			if (settings[type]) setImageId(Number(settings[type]));
		});

		return () => controller.abort();
	}, [type]);

	const updateOption = async (type, id) => {
		await apiFetch({
			path: '/wp/v2/settings',
			method: 'post',
			data: { [type]: id },
		});
	};

	const onUpdateImage = async (image) => {
		setImageId(image.id);
		await updateOption(type, image.id);
		onUpdate();
	};
	const onRemoveImage = async () => {
		setImageId(0);
		await updateOption(type, 0);
	};

	const onDropFiles = (filesList) => {
		uploadMedia({
			allowedTypes: ['image'],
			filesList,
			onFileChange([image]) {
				if (isBlobURL(image?.url)) {
					setIsLoading(true);
					return;
				}
				onUpdateImage(image);
				setIsLoading(false);
			},
			onError(message) {
				console.error({ message });
			},
		});
	};

	return (
		<div>
			<MediaUploadCheck>
				<MediaUpload
					title={title}
					onSelect={onUpdateImage}
					allowedTypes={['image']}
					value={imageId}
					modalClass=""
					render={({ open }) => (
						<div className="relative block">
							<Button
								className={
									'editor-post-featured-image__toggle extendify-assist-upload-logo relative m-0 flex h-48 w-full min-w-full justify-center border-0 bg-gray-100 p-0 text-center text-gray-900 hover:bg-gray-300 hover:text-current'
								}
								onClick={open}
								aria-label={
									!imageId
										? null
										: __('Edit or update the image', 'extendify-local')
								}
								aria-describedby={
									!imageId ? null : `image-${imageId}-describedby`
								}
							>
								{Boolean(imageId) && media && (
									<ResponsiveWrapper
										naturalWidth={mediaWidth}
										naturalHeight={mediaHeight}
										isInline
									>
										<img
											className="inset-0 m-auto block h-auto max-h-48 w-auto max-w-96"
											src={mediaSourceUrl}
											alt=""
										/>
									</ResponsiveWrapper>
								)}
								{isLoading && <Spinner />}
								{!imageId && !isLoading && actionLabel}
							</Button>
							<DropZone
								className="absolute inset-0 h-full w-full"
								onFilesDrop={onDropFiles}
							/>
						</div>
					)}
				/>
			</MediaUploadCheck>
			{Boolean(imageId) && (
				<div className="mt-6 flex justify-between gap-4">
					<MediaUploadCheck>
						<div>
							{imageId && (
								<MediaUpload
									title={title}
									onSelect={onUpdateImage}
									unstableFeaturedImageFlow
									allowedTypes={['image']}
									modalClass="image__media-modal"
									render={({ open }) => (
										<Button onClick={open} variant="secondary">
											{__('Replace image', 'extendify-local')}
										</Button>
									)}
								/>
							)}
							<Button
								onClick={onRemoveImage}
								variant="link"
								className="ml-4"
								isDestructive
							>
								{__('Remove image', 'extendify-local')}
							</Button>
						</div>
						<div>
							<Button
								variant="primary"
								onClick={popModal}
								className="bg-design-main text-design-text"
							>
								{__('Done', 'extendify-local')}
							</Button>
						</div>
					</MediaUploadCheck>
				</div>
			)}
		</div>
	);
};

const MediaUploadCheck = ({ fallback = null, children }) => {
	const { checkingPermissions, hasUploadPermissions } = useSelect((select) => {
		const core = select('core');
		return {
			hasUploadPermissions: core.canUser('read', 'media'),
			checkingPermissions: !core.hasFinishedResolution('canUser', [
				'read',
				'media',
			]),
		};
	});

	return (
		<>
			{checkingPermissions && <Spinner />}
			{!checkingPermissions && hasUploadPermissions ? children : fallback}
		</>
	);
};
