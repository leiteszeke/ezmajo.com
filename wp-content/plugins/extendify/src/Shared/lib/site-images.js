const asImage = (image) => {
	if (typeof image === 'string') return image ? { url: image } : null;
	return typeof image?.url === 'string' && image.url ? image : null;
};

const asImages = (images) =>
	Array.isArray(images) ? images.map(asImage).filter(Boolean) : [];

// Sites launched before the banner picks stored one flat list of urls.
export const normalizeSiteImages = (siteImages) =>
	!siteImages || Array.isArray(siteImages)
		? { hero: [], general: asImages(siteImages) }
		: {
				hero: asImages(siteImages.hero),
				general: asImages(siteImages.general),
			};

export const siteImageUrlsByType = (siteImages) => {
	const { hero, general } = normalizeSiteImages(siteImages);
	const urls = (images) => images.map(({ url }) => url);
	return { hero: urls(hero), general: urls(general) };
};

export const siteImageUrls = (siteImages) => {
	const { hero, general } = siteImageUrlsByType(siteImages);
	return [...hero, ...general];
};
