import { getOption, updateOption } from '@launch/api/WPApi';
import { uploadMedia } from '@wordpress/media-utils';

/**
 * Uploads a logo to WordPress media library.
 * @param {string} url - The image URL (can be a blob or remote link)
 * @param {object} [options={}] - Additional options
 * @param {boolean} [options.forceReplace=false] - Replace existing logo even if one exists
 */
export const uploadLogo = async (url, options = {}) => {
	try {
		const id = await getOption('site_logo');
		if (!Number(id) || options.forceReplace) {
			// Transparent background is required — only these formats support it
			const allowedTypes = ['image/png', 'image/webp', 'image/avif'];

			const blob = await (await fetch(url)).blob();
			if (!allowedTypes.includes(blob.type)) {
				throw new Error(`Unsupported image type: ${blob.type}`);
			}

			const fileExtension = blob.type.replace('image/', '');
			const logoName = `ext-custom-logo-${Date.now()}`;

			await uploadMedia({
				filesList: [
					new File([blob], `${logoName}.${fileExtension}`, {
						type: blob.type,
					}),
				],
				onFileChange: async ([fileObj]) => {
					if (fileObj?.id) {
						await updateOption('site_logo', fileObj.id);
					}
				},
				onError: console.error,
			});
		}
	} catch (error) {
		console.error('Error uploading logo: ', error);
	}
};
