import { usePortal } from '@agent/hooks/usePortal';
import { useWhenFinishedToolProps } from '@agent/hooks/useWhenFinishedToolProps';
import { canvasSeat, canvasView } from '@agent/lib/canvas-views';
import {
	CANVAS_CONFETTI,
	confettiIn,
	dropConfetti,
	FALLING,
} from '@agent/lib/confetti';
import { useGlobalStore } from '@agent/state/global';
import { useWorkflowStore } from '@agent/state/workflows';
import {
	createElement,
	createPortal,
	useEffect,
	useRef,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { close, Icon } from '@wordpress/icons';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';

export const CANVAS_PANE_WIDTH = 384;
const CANVAS_SIZE = {
	width: 768,
	height: 600,
	maxWidth: '100%',
	// A percentage never caps: the flex line is as tall as the box itself.
	maxHeight: 'calc(100vh - 4rem)',
};
const SLIDE_TIME = 300;
const TRANSITION = { duration: SLIDE_TIME / 1000, ease: 'easeInOut' };
const CANVAS_CLASS = 'extendify-agent-canvas-open';
const BLUR_CLASS = 'extendify-agent-canvas-blurred';
const DIM_AGENT_CLASS = 'extendify-agent-canvas-dims-agent';
const MOUNT_ID = 'extendify-agent-canvas-mount';
// Blurring a panel's ancestor would reposition the fixed panel inside it.
const PANEL = '[data-extendify-agent-panel]';
export const DOT_GRID = {
	backgroundImage:
		'radial-gradient(circle, rgb(0 0 0 / 0.12) 1px, transparent 1px)',
	backgroundSize: '12px 12px',
};

const CloseCanvas = ({ onClick }) => (
	<button
		type="button"
		className="absolute end-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-sm border-0 bg-transparent text-gray-900 outline-hidden ring-design-main hover:opacity-80 focus:shadow-none focus:outline-hidden focus:ring-2 focus-visible:outline-design-main"
		onClick={onClick}
	>
		<Icon
			className="pointer-events-none fill-current leading-none"
			icon={close}
			size={18}
		/>
		<span className="sr-only">{__('Close', 'extendify-local')}</span>
	</button>
);

const Celebration = () => {
	const canvas = useRef(null);

	useEffect(() => {
		const shoot = confettiIn(canvas.current);
		let stop = () => {};
		const burst = ({ detail }) => {
			stop();
			stop = dropConfetti(shoot, detail ?? FALLING);
		};
		window.addEventListener(CANVAS_CONFETTI, burst);
		return () => {
			window.removeEventListener(CANVAS_CONFETTI, burst);
			stop();
		};
	}, []);

	return (
		<canvas
			ref={canvas}
			className="pointer-events-none absolute inset-0 z-0 h-full w-full"
		/>
	);
};

// Every node the agent mounts carries this, the mobile pill included.
const AGENT = '.extendify-agent';

const inertNodes = (nodes) => {
	const covered = [...nodes].filter((el) => !el.hasAttribute('inert'));
	for (const el of covered) el.setAttribute('inert', '');

	return () => {
		for (const el of covered) el.removeAttribute('inert');
	};
};

// A trap scoped to the surface would lock the user out of the chat.
const inertBehind = (dims) => {
	const page = [...document.body.children].filter((el) => !el.matches(AGENT));
	const undo = [inertNodes(page)];
	if (dims === 'agent') {
		undo.push(inertNodes(document.querySelectorAll(PANEL)));
	}

	return () => {
		for (const fn of undo) fn();
	};
};

const useCanvasTool = () => {
	const { getWorkflow } = useWorkflowStore();
	const props = useWhenFinishedToolProps();
	const { component, canvas } = getWorkflow()?.whenFinished ?? {};
	const view = canvasView(canvas);
	if (!view || !component || !props?.id) return null;
	return { component, props, view };
};

const useWorkflowView = () =>
	canvasView(useWorkflowStore().getWorkflow()?.whenFinished?.canvas);

export const useCanvasWorkflow = () => Boolean(useWorkflowView());

// Gates on the workflow, not the open surface, or the input flickers to busy first.
export const useCanvasAssist = () => Boolean(useWorkflowView()?.assist);

export const useCanvasOpen = () => Boolean(useCanvasTool());

export const useCanvasSeat = () => {
	const { isMobile, mode } = useGlobalStore();
	const seat = useCanvasTool()?.view.seat ?? null;
	return canvasSeat(seat, { mode, isMobile });
};

// Two layouts can be mounted at once, so each names the seat it hosts.
export const CanvasPane = ({ seat }) => {
	const canvas = useCanvasTool();
	const hosted = useCanvasSeat() === seat;

	return (
		<AnimatePresence>
			{hosted ? <SeatedCanvas canvas={canvas} seat={seat} /> : null}
		</AnimatePresence>
	);
};

const SeatedCanvas = ({ canvas, seat }) => {
	const beside = seat === 'beside';
	// Only the widening sidebar gives the pane somewhere to slide from.
	const slide = beside
		? {
				initial: { x: -CANVAS_PANE_WIDTH },
				animate: { x: 0 },
				exit: { x: -CANVAS_PANE_WIDTH },
				transition: TRANSITION,
			}
		: {};

	return (
		<motion.div
			role="dialog"
			aria-label={__('Agent canvas', 'extendify-local')}
			className={`relative z-0 min-h-0 ${beside ? 'shrink-0' : 'flex-1 min-w-0'}`}
			style={beside ? { width: CANVAS_PANE_WIDTH } : undefined}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={TRANSITION}
		>
			<CloseCanvas onClick={canvas.props.onCancel} />
			<Celebration />
			<div className="relative z-10 h-full overflow-auto px-4 py-12">
				{/* The dotted background must not slide in with the component. */}
				<motion.div className="h-full" {...slide}>
					{createElement(canvas.component, canvas.props)}
				</motion.div>
			</div>
		</motion.div>
	);
};

// Calling usePortal here would leave a mount node behind with no canvas open.
export const Canvas = () => {
	const canvas = useCanvasTool();

	return (
		<AnimatePresence>
			{canvas ? <CanvasOverlay canvas={canvas} /> : null}
		</AnimatePresence>
	);
};

const CanvasOverlay = ({ canvas }) => {
	const { isMobile } = useGlobalStore();
	const mountNode = usePortal(MOUNT_ID);
	const isPresent = useIsPresent();
	const { seat, dims } = canvas.view;
	// Live state is empty during the exit, and a surface appearing then never leaves.
	const embedded = Boolean(seat) && !isMobile;

	// Lifting inert at unmount instead would leave the chat inert as it takes focus.
	useEffect(
		() => (isPresent ? inertBehind(dims) : undefined),
		[isPresent, dims],
	);

	// Closing the canvas leaves focus on a button that no longer exists.
	useEffect(() => {
		if (isPresent) return;
		// The chat can be remounting into another layout in this same commit.
		const frame = requestAnimationFrame(() =>
			document.querySelector('#extendify-agent-chat textarea')?.focus(),
		);
		return () => cancelAnimationFrame(frame);
	}, [isPresent]);

	useEffect(() => {
		const classes =
			dims === 'agent' ? [CANVAS_CLASS, DIM_AGENT_CLASS] : [CANVAS_CLASS];
		document.body.classList.add(...classes);
		// The page has to paint unblurred once, or there is nothing to ease from.
		const frame = requestAnimationFrame(() =>
			document.body.classList.add(BLUR_CLASS),
		);
		return () => {
			cancelAnimationFrame(frame);
			document.body.classList.remove(...classes, BLUR_CLASS);
		};
	}, [dims]);

	// Cleanup runs after the exit, too late for the blur to ease out with it.
	useEffect(() => {
		if (!isPresent) document.body.classList.remove(BLUR_CLASS);
	}, [isPresent]);

	if (!mountNode) return null;

	const fade = {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: TRANSITION,
	};
	// Both clear the admin bar (99999); a dimmed agent panel (999999) needs clearing too.
	const overAgent = dims === 'agent';
	const scrim = (
		<motion.div
			{...fade}
			data-extendify-agent-scrim
			className={`fixed inset-0 bg-black/60 ${overAgent ? 'z-max-1' : 'z-[100000]'}`}
		/>
	);
	return createPortal(
		<>
			{scrim}
			{embedded ? null : (
				<motion.div
					{...fade}
					className={`pointer-events-none fixed inset-0 overflow-auto ${overAgent ? 'z-max' : 'z-[100001]'}`}
				>
					<div className="pointer-events-auto flex min-h-full items-center justify-center px-4 py-8">
						<div
							role="dialog"
							aria-label={__('Agent canvas', 'extendify-local')}
							className="relative overflow-hidden rounded-2xl bg-gray-50 shadow-lg"
							style={{ ...DOT_GRID, ...CANVAS_SIZE }}
						>
							<CloseCanvas onClick={canvas.props.onCancel} />
							<Celebration />
							<div className="relative z-10 h-full overflow-auto px-4 pt-12 pb-8">
								{createElement(canvas.component, canvas.props)}
							</div>
						</div>
					</div>
				</motion.div>
			)}
		</>,
		mountNode,
	);
};
