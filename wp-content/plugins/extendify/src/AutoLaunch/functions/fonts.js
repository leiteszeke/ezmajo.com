// This was mostly copied 1:1 over from legacy launch
import { deepMerge, sleep } from '@shared/lib/utils';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

export const registerFontFamily = async (fontFamily) => {
	try {
		const existingFontFamily = (
			await apiFetch({
				path: addQueryArgs('/wp/v2/font-families', {
					slug: fontFamily.slug,
					_embed: true,
				}),
			})
		)?.[0];

		if (existingFontFamily) {
			return {
				id: existingFontFamily.id,
				...existingFontFamily.font_family_settings,
				fontFace: existingFontFamily._embedded.font_faces.map(
					({ id, font_face_settings }) => ({
						id,
						...font_face_settings,
					}),
				),
			};
		}

		const newFontFamily = await apiFetch({
			path: '/wp/v2/font-families',
			method: 'POST',
			body: makeFontFamilyFormData(fontFamily),
		});

		return {
			id: newFontFamily.id,
			...newFontFamily.font_family_settings,
			fontFace: newFontFamily.fontFaces,
		};
	} catch (error) {
		console.error('Failed to register font family:', error.message);
		return;
	}
};

export const registerFontFace = async ({ fontFamilyId, ...fontFace }) => {
	const max_retries = 2;

	const fontFaceSlug = `${fontFace.fontFamilySlug}-${fontFace.fontWeight}`;

	for (let attempt = 0; attempt <= max_retries; attempt++) {
		try {
			// Add delay of 1 second if this is not the first attempt
			if (attempt > 0) await sleep(1000);

			const response = await apiFetch({
				path: `/wp/v2/font-families/${fontFamilyId}/font-faces`,
				method: 'POST',
				body: makeFontFaceFormData(fontFace),
			});

			return {
				id: response.id,
				...response.font_face_settings,
			};
		} catch (error) {
			if (attempt <= max_retries) {
				console.error(
					`Failed attempt to upload font file ${fontFaceSlug}:`,
					error.message,
				);
				continue;
			}

			console.error(
				`Failed to upload font file ${fontFaceSlug} after ${max_retries + 1} attempts.`,
			);

			return;
		}
	}
};

export const installFontFamily = async (fontFamily) => {
	const fontFaceDownloadRequests = fontFamily.fontFace.map(async (fontFace) => {
		const file = await fetchFontFaceFile(fontFace.src);
		if (!file) return;
		return { ...fontFace, file };
	});

	const fontFacesWithFile = (
		await Promise.all(fontFaceDownloadRequests)
	).filter(Boolean);

	// If we don't have any font file to install, we don't register the font family.
	if (!fontFacesWithFile.length) return;

	const registeredFontFamily = await registerFontFamily(fontFamily);

	// If we couldn't register the font family, we don't register the font faces.
	if (!registeredFontFamily) return;

	// If font family has font faces, it means it was already registered
	// and doesn't need to be installed.
	if (registeredFontFamily?.fontFace?.length) {
		return registeredFontFamily;
	}

	const fontFaces = fontFacesWithFile.map((fontFace) => ({
		fontFamilyId: registeredFontFamily.id,
		fontFamilySlug: registeredFontFamily.slug,
		...fontFace,
	}));

	const registeredFontFaces = [];

	for (const fontFace of fontFaces) {
		registeredFontFaces.push(await registerFontFace(fontFace));
	}

	return {
		...registeredFontFamily,
		fontFace: registeredFontFaces.filter(Boolean),
	};
};

export const installFontFamilies = async (fontFamilies) => {
	const installedFontFamilies = [];

	for (const fontFamily of fontFamilies) {
		installedFontFamilies.push(await installFontFamily(fontFamily));
	}

	return installedFontFamilies.filter(Boolean);
};

export const fetchFontFaceFile = async (url) => {
	for (let attempt = 0; attempt <= 2; attempt++) {
		try {
			// Add delay if this is not the first attempt
			if (attempt > 0) await sleep(1000);

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
			if (attempt <= 2) continue;
			return;
		}
	}
};

export const makeFontFamilyFormData = ({ name, slug, fontFamily }) => {
	const formData = new FormData();
	const fontFamilySettings = { name, slug, fontFamily };
	formData.append('font_family_settings', JSON.stringify(fontFamilySettings));

	return formData;
};

export const makeFontFaceFormData = ({
	fontFamilySlug,
	fontFamily,
	fontStyle,
	fontWeight,
	fontDisplay,
	unicodeRange,
	src = [],
	file = [],
}) => {
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
};

export const mergeFontsIntoVariation = (variation, fonts) =>
	deepMerge(
		variation,
		// We set to null first to reset the field.
		{ settings: { typography: { fontFamilies: { custom: null } } } },
		// We add the installed font families here to activate them.
		{
			settings: {
				typography: {
					fontFamilies: {
						custom: fonts.filter(Boolean),
					},
				},
			},
		},
	);
