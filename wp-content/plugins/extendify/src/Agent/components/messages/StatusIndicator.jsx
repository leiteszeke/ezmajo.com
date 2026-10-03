import { useChatStore } from '@agent/state/chat';
import { useStatusStore } from '@agent/state/status';
import { hasRunComponent } from '@agent/workflows/abilities/components/run';
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
		__('Checking the details...', 'extendify-local'),
		__('Weighing the options...', 'extendify-local'),
		__('Putting it together...', 'extendify-local'),
		__('Still working on it...', 'extendify-local'),
	],
	'workflow-tool-processing': label || __('Processing...', 'extendify-local'),
	'tool-started': label || __('Gathering data...', 'extendify-local'),
	'credits-exhausted': __('Usage limit reached', 'extendify-local'),
	'credits-restored': __('Usage limit restored', 'extendify-local'),
});

const beat = () => 3000 + Math.random() * 2000;

// Randomized 3-5s beat so a long wait never looks stuck or syncs across sites.
// Kept across status changes, or 3s tool steps restart every beat before it lands.
const useCurrentLine = (requestId, lines) => {
	const [tick, setTick] = useState({ requestId, count: 0, due: 0 });
	const current = tick.requestId === requestId;
	const count = current ? tick.count : 0;
	const due = current ? tick.due : 0;

	useEffect(() => {
		if (!lines) return;
		if (!due) {
			setTick({ requestId, count, due: Date.now() + beat() });
			return;
		}
		const timer = setTimeout(
			() => setTick({ requestId, count: count + 1, due: Date.now() + beat() }),
			Math.max(0, due - Date.now()),
		);
		return () => clearTimeout(timer);
	}, [lines, requestId, count, due]);

	if (!Array.isArray(lines)) return lines;
	return lines[Math.min(count, lines.length - 1)];
};

export const useStatusLine = () => {
	const leavingPage = useStatusStore((s) => s.leavingPage);
	const last = useChatStore((s) => s.messages.at(-1));
	const requestId = useChatStore(
		(s) =>
			s.messages.findLast(
				(m) => m.type === 'message' && m.details?.role === 'user',
			)?.id,
	);
	// A live picker shows its own waiting state; the status line would repeat it.
	const awaitingPicker =
		last?.type === 'tool' &&
		!('result' in (last.details ?? {})) &&
		(last.details?.id === 'acquire-image' || hasRunComponent(last.details?.id));
	const { type, label } = useStatusStore((s) => s.statuses.at(-1)) ?? {};
	const lines = useMemo(() => linesFor(label)[type], [label, type]);
	const currentLine = useCurrentLine(requestId, lines);
	const text = leavingPage
		? __('Refreshing the page to show your changes…', 'extendify-local')
		: currentLine;

	if (!text || awaitingPicker) return null;
	return decodeEntities(text);
};

const randomWave = (startY) => {
	const cycles = 1.5 + Math.random();
	const offset = startY - 12;
	const amplitude = Math.max(3.5 + Math.random() * 2.5, Math.abs(offset));
	const rise = Math.asin(offset / amplitude);
	const phase = Math.random() < 0.5 ? rise : Math.PI - rise;
	const points = Array.from({ length: 31 }, (_, i) => {
		const t = i / 30;
		const y = 12 + amplitude * Math.sin(Math.PI * 2 * cycles * t + phase);
		return [3 + 18 * t, y];
	});
	return {
		d: `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}`,
		endY: points.at(-1)[1],
	};
};

export const StatusScribble = () => {
	const [wave, setWave] = useState(() => randomWave(12));
	return (
		<svg
			viewBox="0 0 24 24"
			width="16"
			height="16"
			fill="none"
			aria-hidden="true"
			className="shrink-0 text-design-main"
		>
			<path
				className="status-scribble"
				d={wave.d}
				onAnimationIteration={() => setWave((w) => randomWave(w.endY))}
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				pathLength="1"
			/>
		</svg>
	);
};

export const StatusIndicator = () => {
	const line = useStatusLine();
	// Every chat message clears the statuses; unmounting then cuts the icon's loop short.
	return (
		<div
			data-status-indicator
			className={
				line
					? 'flex items-center gap-1.5 px-1 pb-1.5 text-sm italic text-gray-700'
					: 'invisible flex h-0 overflow-hidden'
			}
		>
			<StatusScribble />
			{/* Reusing the node drops the new line mid-sweep. */}
			{line ? (
				<span key={line} className="status-animation">
					{line}
				</span>
			) : null}
		</div>
	);
};
