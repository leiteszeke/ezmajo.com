const formatImageUrl = (image) =>
	image?.includes('?q=80&w=1470') ? image : `${image}?q=80&w=1470`;

const hashString = (s) => {
	let h = 0;
	for (let i = 0; i < s.length; i++) {
		h = (h * 31 + s.charCodeAt(i)) | 0;
	}
	return Math.abs(h);
};

const seededShuffle = (arr, seed) => {
	const result = [...arr];
	let h = hashString(String(seed));
	for (let i = result.length - 1; i > 0; i--) {
		h = (h * 1103515245 + 12345) | 0;
		const j = Math.abs(h) % (i + 1);
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
};

export const replacePatternImages = (content, images, seed) => {
	if (!images?.length) return content;
	const matches =
		content.match(/https:\/\/images\.unsplash\.com\/[^\s"]+/g) || [];
	const uniqueUrls = [...new Set(matches)];
	const order = seededShuffle(images, seed);
	return uniqueUrls.reduce(
		(updated, url, i) =>
			updated.replaceAll(url, formatImageUrl(order[i] || url)),
		content,
	);
};
