import { useCallback, useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export const UpdatePostConfirm = ({ inputs, onConfirm, onCancel, onRetry }) => {
	const undoTextReplacements = useCallback(() => {
		const replacements = inputs.replacements || [];
		const reversed = replacements.map(({ original, updated }) => ({
			original: updated,
			updated: original,
		}));
		updateAllTextNodesAndAttributes(reversed);
	}, [inputs]);

	const confirmed = useRef(false);
	useEffect(() => {
		return () => {
			if (!confirmed.current) undoTextReplacements();
		};
	}, []);

	const handleConfirm = () => {
		confirmed.current = true;
		// The preview patched the DOM, so only a reload shows what was saved.
		onConfirm({ data: inputs, shouldRefreshPage: true });
	};

	const handleRetry = useCallback(() => {
		undoTextReplacements();
		onRetry();
	}, [undoTextReplacements, onRetry]);

	useEffect(() => {
		updateAllTextNodesAndAttributes(inputs.replacements);
	}, [inputs.replacements]);

	return (
		<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
			<div className="rounded-lg border-b border-gray-300 bg-white">
				<div className="p-3">
					<p className="m-0 p-0 text-sm text-gray-900">
						{__(
							'The agent has made the changes in the browser. Please review and confirm.',
							'extendify-local',
						)}
					</p>
				</div>
			</div>
			<div className="flex flex-wrap justify-start gap-2 p-3">
				<button
					type="button"
					className="flex-1 rounded-sm border border-gray-500 bg-white p-2 text-sm text-gray-900"
					onClick={onCancel}
				>
					{__('Cancel', 'extendify-local')}
				</button>
				<button
					type="button"
					className="flex-1 rounded-sm border border-gray-500 bg-white p-2 text-sm text-gray-900"
					onClick={handleRetry}
				>
					{__('Try Again', 'extendify-local')}
				</button>
				<button
					type="button"
					className="flex-1 rounded-sm border border-design-main bg-design-main p-2 text-sm text-white"
					onClick={handleConfirm}
				>
					{__('Save', 'extendify-local')}
				</button>
			</div>
		</div>
	);
};

const PART_ID_ATTR = 'data-extendify-part-block-id';

// The save rewrites this post alone, so a part preview reverts on the reload.
const isInTemplatePart = (el) => Boolean(el?.closest?.(`[${PART_ID_ATTR}]`));

const updateAllTextNodesAndAttributes = (replacements) => {
	const chat = document.getElementById('extendify-agent-chat');
	const isInChat = (node) => chat?.contains(node);
	// Update all text nodes
	const walker = document.createTreeWalker(
		document.body,
		NodeFilter.SHOW_TEXT,
		null,
		false,
	);
	let node = walker.nextNode();
	while (node) {
		const current = node;
		node = walker.nextNode();
		if (isInChat(current.parentNode)) continue;
		if (isInTemplatePart(current.parentElement)) continue;

		for (const { original, updated } of replacements ?? []) {
			const value = current.nodeValue ?? '';
			if (!value.includes(original)) continue;
			current.nodeValue = value.split(original).join(updated);
		}
	}

	// Update attributes
	['alt', 'title', 'aria-label', 'href', 'data-id'].forEach((attr) => {
		document.querySelectorAll(`[${attr}]`).forEach((el) => {
			if (isInChat(el)) return;
			if (isInTemplatePart(el)) return;
			for (const { original, updated } of replacements ?? []) {
				const val = el.getAttribute(attr);
				if (!val?.includes(original)) continue;
				el.setAttribute(attr, val.split(original).join(updated));
			}
		});
	});
};
