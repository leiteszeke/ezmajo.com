import { ImageUploader } from '@agent/components/ImageUploader';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const updateLinkHrefAttr = (url) => {
	document.querySelectorAll('link[rel*="icon"]')?.forEach((link) => {
		link.href = url;
	});
};

export const UpdateSiteIconConfirm = ({ onConfirm, onCancel }) => {
	const [originalSiteIconUrl, setOriginalSiteIconUrl] = useState();

	useEffect(() => {
		setOriginalSiteIconUrl(
			document.querySelector('link[rel="icon"]')?.href ?? null,
		);
	}, []);

	const undoSiteIconChange = useCallback(() => {
		if (originalSiteIconUrl) {
			updateLinkHrefAttr(originalSiteIconUrl);
		}
	}, [originalSiteIconUrl]);

	const confirmed = useRef(false);
	useEffect(() => {
		if (!originalSiteIconUrl) return;
		return () => {
			if (!confirmed.current) undoSiteIconChange();
		};
	}, [originalSiteIconUrl]);

	useEffect(() => {
		// Put modal above the Agent
		const style = document.createElement('style');
		style.textContent = `.media-modal {
			z-index: 999999 !important;
		}`;
		document.head.appendChild(style);
		return () => style.remove();
	}, []);

	const handleConfirm = async ({ imageId }) => {
		confirmed.current = true;
		await onConfirm({
			data: { imageId },
			shouldRefreshPage: true,
		});
	};

	const handleSelect = (image) => {
		updateLinkHrefAttr(image.url);
	};

	return (
		<Wrapper>
			<div className="relative p-3">
				<ImageUploader
					type="site_icon"
					title={__('Site icon', 'extendify-local')}
					actionLabel={__('Set site icon', 'extendify-local')}
					onSave={handleConfirm}
					onCancel={onCancel}
					onSelect={handleSelect}
				/>
			</div>
		</Wrapper>
	);
};

const Wrapper = ({ children }) => (
	<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
		{children}
	</div>
);
