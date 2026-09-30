import { decodeEntities } from '@wordpress/html-entities';

/** Removes any hash or qs values from URL - Airtable adds timestamps */
export const stripUrlParams = (url) => url?.[0]?.url?.split(/[?#]/)?.[0];

function cleanAndBuildUnsplashUrl(url) {
	const cleanUrl = url
		.replaceAll('\\u0026', '&')
		// Remove duplicate question marks in URL by replacing second '?' with '&'
		.replace(/(\?.*?)\?/, '$1&');
	const imageUrl = new URL(decodeEntities(cleanUrl));

	const size = 1440;
	const orientation = imageUrl.searchParams.get('orientation');

	if (orientation === 'portrait') {
		imageUrl.searchParams.set('h', size);
		imageUrl.searchParams.delete('w');
	} else if (orientation === 'landscape' || orientation === 'square') {
		const widthParam = imageUrl.searchParams.get('w');
		if (widthParam === null || widthParam === '') {
			imageUrl.searchParams.set('w', size);
		}
	}

	imageUrl.searchParams.delete('orientation');
	imageUrl.searchParams.delete('ixid');
	imageUrl.searchParams.delete('ixlib');
	imageUrl.searchParams.append('q', '0');
	imageUrl.searchParams.append('auto', 'format,compress');
	imageUrl.searchParams.append('fm', 'avif');
	return (
		imageUrl
			.toString()
			// Remove duplicate question marks in URL by replacing second '?' with '&'
			.replace(/(\?.*?)\?/, '$1&')
	);
}

export const lowerImageQuality = (html) => {
	return html.replace(
		/https:\/\/images\.unsplash\.com\/[^"')]+/g,
		cleanAndBuildUnsplashUrl,
	);
};

export const hexTomatrixValues = (hex) => {
	// convert from hex
	const colorInt = parseInt(hex.replace('#', ''), 16);
	// convert to rgb
	// This shifts each primary color value to the right-most 8 bits
	// then applies a mask to get the value of that color
	const r = (colorInt >> 16) & 255;
	const g = (colorInt >> 8) & 255;
	const b = colorInt & 255;
	// normalize to 0-1
	return [
		Math.round((r / 255) * 10000) / 10000,
		Math.round((g / 255) * 10000) / 10000,
		Math.round((b / 255) * 10000) / 10000,
	];
};
