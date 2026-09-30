// `--ext-*` resolves once at the scope root, so setting it here reaches nothing.
const BAR_SURFACE = {
	main: '--color-design-main',
	text: '--color-design-text',
};

// No partner color behind the card, so it has no `--color-*` alias to set.
const CARD_SURFACE = {
	main: '--ext-notification-card-main',
	text: '--ext-notification-card-text',
};

const buttonMap = (main, text) => ({
	'button-main': main,
	'button-text': text,
	'button-hover-main': '--ext-notification-button-hover-main',
	'button-hover-text': '--ext-notification-button-hover-text',
});

const BANNER_BUTTON = buttonMap('--color-banner-main', '--color-banner-text');
const DESIGN_BUTTON = buttonMap('--color-design-main', '--color-design-text');

const variablesFrom = (map, colors) =>
	Object.fromEntries(
		Object.entries(colors)
			.filter(([key, value]) => map[key] && typeof value === 'string')
			.map(([key, value]) => [map[key], value]),
	);

export const colorsOf = (notification) => notification?.colors ?? {};

export const barVariables = (colors) => variablesFrom(BAR_SURFACE, colors);

export const cardVariables = (colors) => variablesFrom(CARD_SURFACE, colors);

export const bannerButtonVariables = (colors) =>
	variablesFrom(BANNER_BUTTON, colors);

export const designButtonVariables = (colors) =>
	variablesFrom(DESIGN_BUTTON, colors);

export const buttonHoverClasses = (colors) => ({
	'hover:bg-[var(--ext-notification-button-hover-main)]': Boolean(
		colors['button-hover-main'],
	),
	'hover:text-[var(--ext-notification-button-hover-text)]': Boolean(
		colors['button-hover-text'],
	),
	// A supplied hover color has to land exactly, not dimmed.
	'hover:opacity-90':
		!colors['button-hover-main'] && !colors['button-hover-text'],
});
