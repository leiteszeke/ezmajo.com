import { useStatusStore } from '@agent/state/status';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';

const linesFor = (label) => ({
	'calling-agent': __('Thinking...', 'extendify-local'),
	'agent-working': [
		__('Working on it...', 'extendify-local'),
		__('Interpreting message...', 'extendify-local'),
		__('Formulating a response...', 'extendify-local'),
		__('Reviewing logic...', 'extendify-local'),
	],
	'workflow-tool-processing': __('Processing...', 'extendify-local'),
	'tool-started': label || __('Gathering data...', 'extendify-local'),
	'credits-exhausted': __('Usage limit reached', 'extendify-local'),
	'credits-restored': __('Usage limit restored', 'extendify-local'),
});

// Randomized 3-5s beat so a long wait never looks stuck or syncs across sites.
const useCurrentLine = (lines) => {
	const [index, setIndex] = useState(0);
	const isList = Array.isArray(lines);

	useEffect(() => setIndex(0), [lines]);

	useEffect(() => {
		if (!isList) return;
		const timer = setTimeout(
			() => setIndex((i) => (i + 1) % lines.length),
			3000 + Math.random() * 2000,
		);
		return () => clearTimeout(timer);
	}, [isList, lines, index]);

	return isList ? lines[index] : lines;
};

export const StatusIndicator = () => {
	const leavingPage = useStatusStore((s) => s.leavingPage);
	const { type, label } = useStatusStore((s) => s.statuses.at(-1)) ?? {};
	const lines = useMemo(() => linesFor(label)[type], [label, type]);
	const currentLine = useCurrentLine(lines);
	const text = leavingPage
		? __('Refreshing the page to show your changes…', 'extendify-local')
		: currentLine;

	if (!text) return null;

	return (
		<div className="p-2 text-center text-xs italic text-gray-700">
			{/* Reusing the node drops the new line mid-sweep. */}
			<span key={text} className="status-animation">
				{decodeEntities(text)}
			</span>
		</div>
	);
};
