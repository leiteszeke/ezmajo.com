/**
 * Resize an image to the specified dimensions.
 *
 * @param {string} imageUrl - The source URL or blob URL of the image.
 * @param {Object} options - Configuration options.
 * @param {{ width: number, height: number }} options.size - Required size (e.g., { width: 64, height: 64 }).
 * @param {string} [options.mimeType='image/png'] - Output format (e.g., 'image/png', 'image/webp').
 * @returns {Promise<string>} - A blob URL of the resized image.
 *
 * @throws Will throw an error if imageUrl or size is invalid, or if resizing fails.
 */
export const resizeImage = async (imageUrl, options = {}) => {
	const { size, mimeType = 'image/png' } = options;

	if (
		!imageUrl ||
		!size ||
		typeof size.width !== 'number' ||
		typeof size.height !== 'number' ||
		size.width <= 0 ||
		size.height <= 0
	) {
		throw new Error('Invalid imageUrl or size dimensions');
	}

	const img = await loadImage(imageUrl);
	const canvas = document.createElement('canvas');
	canvas.width = size.width;
	canvas.height = size.height;

	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, size.width, size.height);
	ctx.drawImage(img, 0, 0, size.width, size.height);

	return new Promise((resolve) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					throw new Error('Failed to create blob from canvas');
				}
				resolve(URL.createObjectURL(blob));
			},
			mimeType,
			0.95,
		);
	});
};

const loadImage = (src) =>
	new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
