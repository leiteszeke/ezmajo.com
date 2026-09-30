import { getMediaDetails } from '@assist/lib/media';
import {
	addCustomMediaViewsCss,
	removeCustomMediaViewsCss,
} from '@shared/lib/media-views';
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
import classnames from 'classnames';

const allowedTypes = ['image'];

const getSettings = (signal) => {
	return apiFetch({
		path: '/wp/v2/settings',
		signal,
	});
};

export const ImageUploader = ({
	type,
	onSave,
	onCancel,
	onSelect,
	title,
	actionLabel,
}) => {
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [savedImageId, setSavedImageId] = useState(null);
	const [selectedImageId, setSelectedImageId] = useState(null);

	const imageId = selectedImageId || savedImageId;

	const media = useSelect(
		(select) => {
			return select(coreStore).getEntityRecord(
				'postType',
				'attachment',
				imageId,
			);
		},
		[imageId],
	);
	const { mediaWidth, mediaHeight, mediaSourceUrl } = getMediaDetails(media);

	useEffect(() => {
		addCustomMediaViewsCss();

		return () => removeCustomMediaViewsCss();
	}, []);

	useEffect(() => {
		const controller = new AbortController();

		setIsLoading(true);

		getSettings(controller.signal)
			.then((settings) => {
				if (settings[type]) setSavedImageId(Number(settings[type]));
			})
			.finally(() => setIsLoading(false));

		return () => controller.abort();
	}, [type]);

	const handleOnSelectImage = (image) => {
		if (image.id === imageId) {
			return;
		}

		setSelectedImageId(image.id);
		onSelect?.(image);
	};

	const onRemoveImage = () => {
		setSelectedImageId(null);
		setSavedImageId(null);
		onCancel();
	};

	const handleOnSave = async () => {
		setIsSaving(true);

		try {
			await onSave?.({ imageId: selectedImageId });
		} catch (error) {
			console.error(error);
		} finally {
			setIsSaving(false);
		}
	};

	const onDropFiles = (filesList) => {
		uploadMedia({
			allowedTypes,
			filesList,
			onFileChange([image]) {
				if (isBlobURL(image?.url)) {
					setIsLoading(true);
					return;
				}
				handleOnSelectImage(image);
				setIsLoading(false);
			},
			onError(message) {
				console.error({ message });
			},
		});
	};

	return (
		<div className="extendify-shared">
			<MediaUploadCheck>
				<MediaUpload
					title={title}
					onSelect={handleOnSelectImage}
					allowedTypes={allowedTypes}
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
								{imageId && media && !isLoading && (
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
								{!imageId &&
									!isLoading &&
									(actionLabel || (
										<div className="flex flex-col">{actionLabel}</div>
									))}
							</Button>
							<DropZone
								className="absolute inset-0 h-full w-full"
								onFilesDrop={onDropFiles}
								label={__('Drop images to upload', 'extendify-local')}
							/>
						</div>
					)}
				/>

				<div className="mt-6">
					<div className="flex gap-2">
						<button
							type="button"
							onClick={onRemoveImage}
							className={classnames(
								'w-full rounded-sm border border-gray-300 bg-white p-2 text-sm text-gray-800 hover:bg-gray-50',
								{
									'cursor-not-allowed': isSaving,
								},
							)}
							disabled={isSaving}
						>
							{__('Cancel', 'extendify-local')}
						</button>

						{!selectedImageId && (
							<MediaUpload
								title={title}
								onSelect={handleOnSelectImage}
								allowedTypes={allowedTypes}
								modalClass="image__media-modal"
								render={({ open }) => (
									<button
										type="button"
										onClick={open}
										className="w-full rounded-sm border border-design-main bg-design-main p-2 text-sm text-white hover:bg-gray-800"
									>
										{__('Open Media Library', 'extendify-local')}
									</button>
								)}
							/>
						)}

						{selectedImageId && (
							<button
								type="button"
								onClick={handleOnSave}
								className={classnames(
									'flex items-center justify-center w-full rounded-sm border border-design-main bg-design-main p-2 text-sm text-white hover:bg-gray-800',
									{
										'cursor-not-allowed': isSaving,
									},
								)}
								disabled={isSaving}
							>
								{isSaving ? (
									<Spinner className="m-0" />
								) : (
									__('Save', 'extendify-local')
								)}
							</button>
						)}
					</div>
				</div>
			</MediaUploadCheck>
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
