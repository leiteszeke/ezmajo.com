// No seat means a modal of the canvas alone.
// dims 'agent' puts the agent window behind the scrim along with the page.
const VIEWS = {
	assisted: { assist: true, seat: 'beside', dims: 'page' },
	'assisted-modal': { assist: true, seat: 'modal', dims: 'page' },
	simple: { assist: false, seat: null, dims: 'agent' },
};

// An unknown or absent view renders whenFinished inline in the transcript.
export const canvasView = (name) => VIEWS[name] ?? null;

// Only the docked sidebar can widen for a pane; mobile has room for neither.
export const canvasSeat = (seat, { mode, isMobile }) => {
	if (!seat || isMobile) return null;
	if (seat === 'modal') return 'modal';
	return mode === 'docked-left' ? 'beside' : 'modal';
};
