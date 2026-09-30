import {
	fetchSharedBlockUsage,
	isSharedBlockId,
	sharedBlockNotice,
} from '@agent/lib/shared-block-usage';
import { useEffect, useState } from '@wordpress/element';

export const SharedBlockNotice = ({ blockIds }) => {
	const [notice, setNotice] = useState(null);
	const shared = (Array.isArray(blockIds) ? blockIds : []).find((id) =>
		isSharedBlockId(id),
	);

	useEffect(() => {
		if (!shared) return setNotice(null);
		let live = true;
		fetchSharedBlockUsage(shared)
			.then((usage) => live && setNotice(sharedBlockNotice(usage)))
			// A missing scope must not block the save the user already reviewed.
			.catch(() => live && setNotice(null));
		return () => {
			live = false;
		};
	}, [shared]);

	if (!notice) return null;

	return (
		<p className="m-0 mt-2 p-0 text-sm text-gray-700">
			<span aria-hidden="true">⚠ </span>
			<span>{notice}</span>
		</p>
	);
};
