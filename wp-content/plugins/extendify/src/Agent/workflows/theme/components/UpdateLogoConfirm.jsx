import { ImageUploader } from '@agent/components/ImageUploader';
import { useQuickEditStore } from '@quick-edit/state/store';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const updateLogoSrcAttr = (url, cssFilter) => {
	document.querySelectorAll('.wp-block-site-logo img')?.forEach((img) => {
		img.srcset = '';
		img.src = url;
		img.style.filter = cssFilter ?? '';
	});
};

export const UpdateLogoConfirm = ({ onConfirm, onCancel }) => {
	const block = useQuickEditStore((s) => s.agentBlock);

	const [originalLogoImgSrc, setOriginalLogoImgSrc] = useState();

	useEffect(() => {
		setOriginalLogoImgSrc(
			document.querySelector('.wp-block-site-logo img')?.src ?? null,
		);
	}, [block]);

	const undoLogoChange = useCallback(() => {
		if (originalLogoImgSrc) {
			updateLogoSrcAttr(originalLogoImgSrc);
		}
	}, [originalLogoImgSrc]);

	const confirmed = useRef(false);
	useEffect(() => {
		if (!originalLogoImgSrc) return;
		return () => {
			if (!confirmed.current) undoLogoChange();
		};
	}, [originalLogoImgSrc]);

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
			shouldRefreshPage: !window.extAgentData?.context?.adminPage,
		});
	};

	const handleSelect = (image) => {
		updateLogoSrcAttr(image.url, 'none');
	};

	return (
		<Wrapper>
			<div className="relative p-3">
				<ImageUploader
					type="site_logo"
					title={__('Site logo', 'extendify-local')}
					actionLabel={__('Set site logo', 'extendify-local')}
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
