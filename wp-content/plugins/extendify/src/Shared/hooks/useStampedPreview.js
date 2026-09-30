import { stampImageBlob } from '@shared/lib/ai-label';
import { useEffect, useState } from '@wordpress/element';

// Reuses the importer's drawing so the preview can't drift from the import.
export const useStampedPreview = (url, disclose) => {
	const [stamped, setStamped] = useState(null);

	useEffect(() => {
		setStamped(null);
		if (!url || !disclose) return;

		let objectUrl = null;
		let cancelled = false;
		stampImageBlob(url).then((blob) => {
			if (!blob) return;
			objectUrl = URL.createObjectURL(blob);
			if (cancelled) return URL.revokeObjectURL(objectUrl);
			setStamped(objectUrl);
		});

		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [url, disclose]);

	return stamped ?? url;
};
