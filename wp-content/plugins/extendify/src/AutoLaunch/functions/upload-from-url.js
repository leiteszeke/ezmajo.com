import { fetchWithTimeout } from '@auto-launch/functions/helpers';
import { digest } from '@shared/api/digest';
import { uploadMedia } from '@wordpress/media-utils';

export const uploadMediaFromUrl = async (
	url,
	{ prefix, caller, timeoutMs = 60000 },
) => {
	try {
		const response = await fetchWithTimeout(url);
		// An expired signed url answers 403 with an XML body that would upload fine.
		if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

		const blob = await response.blob();
		const type = blob.type || 'image/jpeg';
		const fileExtension = type.replace('image/', '');
		const name = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		const file = new File([blob], `${name}.${fileExtension}`, { type });

		return await new Promise((resolve) => {
			let settled = false;
			const settle = (fileObj) => {
				if (settled) return;
				settled = true;
				clearTimeout(timeoutId);
				resolve(fileObj);
			};
			const fail = (error) => {
				digest({ error, details: { source: 'auto-launch', caller, url } });
				settle(null);
			};
			// uploadMedia can go quiet without erroring, and the step machinery only
			// retries on errors — an unsettled upload strands the whole launch.
			const timeoutId = setTimeout(
				() => fail(new Error(`Upload timed out after ${timeoutMs}ms`)),
				timeoutMs,
			);
			uploadMedia({
				filesList: [file],
				// uploadMedia calls onFileChange first with a blob-URL placeholder
				// (no id), then again with the real attachment — wait for the id.
				onFileChange: ([fileObj]) => {
					if (!fileObj?.id) return;
					settle(fileObj);
				},
				onError: fail,
			});
		});
	} catch (err) {
		digest({
			error: err,
			details: { source: 'auto-launch', caller, url },
		});
		return null;
	}
};
