import { sleep } from '@shared/lib/utils';

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second in milliseconds

export const fetchFontFaceFile = async (url) => {
	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			// Add delay if this is not the first attempt
			if (attempt > 0) await sleep(RETRY_DELAY);

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error('Failed to fetch font file.');
			}

			const blob = await response.blob();
			const filename = url.split('/').pop();

			return new File([blob], filename, {
				type: blob.type,
			});
		} catch (_) {
			if (attempt <= MAX_RETRIES) continue;

			console.error(
				`Failed to fetch font file after ${MAX_RETRIES + 1} attempts.`,
			);

			return;
		}
	}
};

export function makeFontFamilyFormData({ name, slug, fontFamily }) {
	const formData = new FormData();
	const fontFamilySettings = { name, slug, fontFamily };
	formData.append('font_family_settings', JSON.stringify(fontFamilySettings));

	return formData;
}

export function makeFontFaceFormData({
	fontFamilySlug,
	fontFamily,
	fontStyle,
	fontWeight,
	fontDisplay,
	unicodeRange,
	src = [],
	file = [],
}) {
	const formData = new FormData();
	const fontFaceSettings = {
		fontFamily,
		fontStyle,
		fontWeight,
		fontDisplay,
		unicodeRange:
			unicodeRange === undefined || unicodeRange === null ? '' : unicodeRange,
		src: Array.isArray(src) ? src : [src],
	};
	const files = Array.isArray(file) ? file : [file];

	// Add each font file to the form data.
	files.forEach((file) => {
		const fileId = `${fontFamilySlug}-${fontWeight}-${fontStyle}`;
		formData.append(fileId, file, file.name);

		// Use the file ids as src for WP to match and upload the files.
		if (!src?.length) {
			fontFaceSettings.src.push(fileId);
		} else {
			fontFaceSettings.src = [fileId];
		}
	});

	formData.append('font_face_settings', JSON.stringify(fontFaceSettings));

	return formData;
}
