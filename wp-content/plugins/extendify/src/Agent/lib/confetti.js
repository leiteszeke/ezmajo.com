import confetti from 'canvas-confetti';

export const CANVAS_CONFETTI = 'extendify-agent:canvas-confetti';

let confettiInstance = null;

const ensureConfettiInstance = () => {
	if (confettiInstance) return confettiInstance;

	// Custom canvas to account for height issues
	const canvas = document.createElement('canvas');
	canvas.style.position = 'fixed';
	canvas.style.top = '0';
	canvas.style.left = '0';
	canvas.style.width = '100%';
	canvas.style.height = '100%';
	canvas.style.pointerEvents = 'none';
	canvas.style.zIndex = Number.MAX_SAFE_INTEGER;
	document.body.appendChild(canvas);

	confettiInstance = confetti.create(canvas, {
		disableForReducedMotion: true,
		resize: true,
	});
	return confettiInstance;
};

// Its own canvas is what confines a burst to the element that asked.
export const confettiIn = (canvas) =>
	confetti.create(canvas, { disableForReducedMotion: true, resize: true });

const TOP = () => ({ x: Math.random(), y: 0 });

// A zero start velocity is what makes it fall rather than be thrown.
export const FALLING = {
	interval: 55,
	perDrop: 2,
	drift: 0.5,
	origin: TOP,
	colors: [
		'#26ccff',
		'#a25afd',
		'#ff5e7e',
		'#88ff5a',
		'#fcff42',
		'#ffa62d',
		'#ff36ff',
	],
	shot: {
		particleCount: 1,
		startVelocity: 0,
		gravity: 0.9,
		ticks: 300,
		scalar: 0.85,
	},
};

// An absent interval is what makes it fire once instead of repeating.
export const THROW = {
	perDrop: 2,
	origin: (i) => ({ x: i, y: 0.75 }),
	shot: {
		particleCount: 70,
		startVelocity: 50,
		spread: 75,
		decay: 0.91,
		ticks: 220,
		scalar: 0.95,
	},
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// A multi-particle shot cannot spread at zero velocity, so it lands as one clump.
// A one-particle shot takes only the first colour of the palette.
export const dropConfetti = (
	shoot,
	{ interval, shot, drift = 0, perDrop = 1, colors, origin = TOP },
) => {
	const drop = () => {
		for (let i = 0; i < perDrop; i++) {
			shoot({
				...shot,
				origin: origin(i),
				...(drift && { drift: (Math.random() * 2 - 1) * drift }),
				...(colors && { colors: [pick(colors)] }),
			});
		}
	};
	drop();
	if (!interval) return () => {};
	const timer = setInterval(drop, interval);
	return () => clearInterval(timer);
};

export const throwSideConfetti = (shoot) => {
	const LEFT = {
		count: 200,
		defaults: {
			origin: { y: 0.7, x: 0 },
		},
		shots: [
			{ ratio: 0.25, spread: 26, startVelocity: 55 },
			{ ratio: 0.2, spread: 60 },
			{ ratio: 0.35, spread: 100, decay: 0.91, scalar: 0.8 },
			{ ratio: 0.1, spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 },
			{ ratio: 0.1, spread: 120, startVelocity: 45 },
		],
	};
	const shooter = shoot ?? ensureConfettiInstance();
	throwConfetti(LEFT, shooter);
	throwConfetti(
		{
			...LEFT,
			defaults: {
				origin: { y: 0.7, x: 1 },
			},
		},
		shooter,
	);
};

const throwConfetti = (config, shoot) => {
	const { count = 1, defaults, shots } = config;

	shots.forEach(({ ratio = 1, ...opts }) => {
		shoot({
			...(defaults ?? {}),
			...(opts ?? {}),
			particleCount: Math.floor(count * ratio),
			zIndex: Number.MAX_SAFE_INTEGER,
		});
	});
};
