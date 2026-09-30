import { pasteHandler, serialize } from '@wordpress/blocks';
import { useRef } from '@wordpress/element';

export const Completion = ({ completion }) => {
	const blocks = pasteHandler({ plainText: completion });
	const ref = useRef();

	return (
		<div
			ref={ref}
			style={{ fontSize: 'clamp(1em 1em 1em)' }}
			className="completion relative max-h-60 overflow-y-auto break-words px-5 pt-4"
			data-test="completion-input"
		>
			{Array.isArray(blocks) ? (
				<div dangerouslySetInnerHTML={{ __html: serialize(blocks) }} />
			) : (
				<div dangerouslySetInnerHTML={{ __html: blocks }} />
			)}
		</div>
	);
};
