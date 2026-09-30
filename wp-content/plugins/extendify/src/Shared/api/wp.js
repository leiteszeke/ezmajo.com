import { AI_HOST } from '@constants';
import { renderAiLabelPill, stampAiLabel } from '@shared/lib/ai-label';
import apiFetch from '@wordpress/api-fetch';
import { sprintf } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

export const getPlugin = async (slug) => {
	const response = await apiFetch({
		path: addQueryArgs('/wp/v2/plugins', { search: slug }),
	});

	const plugin = response?.[0];

	if (!plugin) throw new Error('Plugin not found');

	return plugin;
};

export const getAllPlugins = async () => {
	const response = await apiFetch({
		path: '/wp/v2/plugins',
	});

	if (!response) {
		throw new Error('Failed to fetch installed plugins');
	}

	return response;
};

export const enableAutoUpdate = async (plugin) => {
	if (!plugin) return;
	try {
		await apiFetch({
			path: '/extendify/v1/shared/enable-auto-update',
			method: 'POST',
			data: { plugin },
		});
	} catch (_e) {
		// Best-effort: the install already succeeded.
	}
};

export const installPlugin = async (slug) => {
	const plugin = await apiFetch({
		path: '/wp/v2/plugins',
		method: 'POST',
		data: {
			slug,
		},
	});

	await enableAutoUpdate(plugin?.plugin);

	return plugin;
};

export const activatePlugin = async (slug) => {
	const plugin = await getPlugin(slug);

	return await apiFetch({
		path: `/wp/v2/plugins/${plugin.plugin}`,
		method: 'POST',
		data: {
			status: 'active',
		},
	});
};

export const loadImage = (img) => {
	return new Promise((resolve, reject) => {
		img.onload = () => resolve(img);
		img.onerror = (e) => reject(e);
	});
};

const shouldDisclose = (metadata) =>
	Boolean(metadata.aiGenerated) && Boolean(metadata.disclose);

const altText = (metadata) => {
	if (!shouldDisclose(metadata)) return metadata.alt ?? '';
	const pattern = window.extSharedData?.aiImageAltPattern ?? 'AI Generated: %s';
	return sprintf(pattern, metadata.alt ?? '').trim();
};

export const importImage = async (imageUrl, metadata = {}) => {
	const image = new Image();
	image.src = imageUrl;
	image.crossOrigin = 'anonymous';
	await loadImage(image);

	const canvas = document.createElement('canvas');
	canvas.width = image.width;
	canvas.height = image.height;

	const ctx = canvas.getContext('2d');
	if (!ctx) return;
	ctx.drawImage(image, 0, 0);
	if (shouldDisclose(metadata)) {
		stampAiLabel(ctx, canvas.width, canvas.height);
	}

	const blob = await new Promise((resolve) => {
		canvas.toBlob((blob) => {
			blob && resolve(blob);
		}, 'image/jpeg');
	});

	const formData = new FormData();
	formData.append('file', new File([blob], metadata.filename));
	formData.append('alt_text', altText(metadata));
	formData.append('caption', metadata.caption ?? '');
	formData.append('status', 'publish');
	if (metadata.aiGenerated) {
		formData.append('meta[extendify_ai_generated]', '1');
	}

	return await apiFetch({
		path: 'wp/v2/media',
		method: 'POST',
		body: formData,
	});
};

export const importImageServer = async (src, metadata = {}) => {
	const formData = new FormData();
	formData.append('source', src);
	// Fallback doesn't support custom file_name
	formData.append('alt_text', altText(metadata));
	formData.append('caption', metadata.caption ?? '');
	if (metadata.aiGenerated) {
		formData.append('ai_generated', '1');
		if (shouldDisclose(metadata)) {
			const pill = await renderAiLabelPill();
			if (pill) {
				formData.append(
					'disclosure_label',
					new File([pill], 'disclosure-label.png', { type: 'image/png' }),
				);
			}
		}
	}

	return await apiFetch({
		path: '/extendify/v1/draft/upload-image',
		method: 'POST',
		body: formData,
	});
};

export const downloadImage = async (
	id,
	src,
	source,
	unsplashId,
	metadata = { alt: '', caption: '' },
) => {
	let image;
	const aiGenerated = source === 'ai-generated';
	if (unsplashId) {
		await downloadPing(id, source, { unsplashId });
	} else if (aiGenerated && id) {
		await downloadPing(id, source, { disclose: metadata.disclose });
	}
	try {
		image = await importImage(src, {
			alt: metadata.alt,
			filename: metadata.filename ?? 'image.jpg',
			caption: metadata.caption,
			aiGenerated,
			disclose: metadata.disclose,
		});
	} catch (_e) {
		image = await importImageServer(src, {
			alt: metadata.alt,
			caption: metadata.caption,
			aiGenerated,
			disclose: metadata.disclose,
		});
	}

	return image;
};

export const downloadPing = (id, source, details = {}) =>
	fetch(`${AI_HOST}/api/draft/image/download`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ id, source, ...details }),
	});
