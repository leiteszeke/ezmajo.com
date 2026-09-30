import {
	createShaderCanvas,
	DEFAULT_SHADER,
} from '@auto-launch/functions/shader-canvas';
import { derivedShaderColors } from '@auto-launch/functions/shader-colors';
import { BG_SOURCE_ATTR } from '@auto-launch/functions/tokens';
import { useEffect, useRef, useState } from '@wordpress/element';
import { colord } from 'colord';
import { useReducedMotion } from 'framer-motion';

// The resolved tokens sit on the wrapper, not :root, so read from inside it.
const readVar = (node, name) =>
	getComputedStyle(node).getPropertyValue(name).trim();

const readSource = (node) =>
	node.closest(`[${BG_SOURCE_ATTR}]`)?.getAttribute(BG_SOURCE_ATTR) ||
	DEFAULT_SHADER;

const toTriple = (value) => {
	const { r, g, b } = colord(value).toRgb();
	return [r / 255, g / 255, b / 255];
};

const derivedColors = (node) =>
	derivedShaderColors(
		readVar(node, '--color-ui-page') || '#2271b1',
		readVar(node, '--color-ui-action') || '#2271b1',
	);

const numberVar = (node, name, fallback) => {
	const raw = readVar(node, name);
	if (!raw) return fallback;
	const value = Number.parseFloat(raw);
	return Number.isNaN(value) ? fallback : value;
};

export const ShaderBackground = ({ still = false }) => {
	const canvasRef = useRef(null);
	const engineRef = useRef(null);
	const shouldReduceMotion = useReducedMotion();
	const [tokens, setTokens] = useState(null);

	useEffect(() => {
		const node = canvasRef.current;
		if (!node) return;
		const read = () => {
			const derived = derivedColors(node);
			setTokens({
				source: readSource(node),
				speed: numberVar(node, '--ext-ui-bg-speed', 1),
				scale: numberVar(node, '--ext-ui-bg-scale', 1),
				intensity: numberVar(node, '--ext-ui-bg-intensity', 1),
				offset: [
					numberVar(node, '--ext-ui-bg-offset-x', 0),
					numberVar(node, '--ext-ui-bg-offset-y', 0),
				],
				colors: [
					readVar(node, '--ext-ui-bg-color-1') || derived[0],
					readVar(node, '--ext-ui-bg-color-2') || derived[1],
					readVar(node, '--ext-ui-bg-color-3') || derived[2],
				],
			});
		};
		read();
	}, []);

	useEffect(() => {
		const engine = createShaderCanvas(canvasRef.current);
		engineRef.current = engine;
		return () => {
			engine?.destroy();
			engineRef.current = null;
		};
	}, []);

	useEffect(() => {
		const engine = engineRef.current;
		if (!engine || !tokens) return;
		// GLSL compiles per driver, so a design's own source can be rejected here.
		if (engine.setSource(tokens.source)) return;
		engine.setSource(DEFAULT_SHADER);
	}, [tokens]);

	useEffect(() => {
		if (!tokens) return;
		engineRef.current?.setValues({
			speed: tokens.speed,
			scale: tokens.scale,
			intensity: tokens.intensity,
			offset: tokens.offset,
			colors: tokens.colors.map(toTriple),
		});
	}, [tokens]);

	useEffect(() => {
		engineRef.current?.setStill(still || Boolean(shouldReduceMotion));
	}, [still, shouldReduceMotion]);

	return (
		<canvas
			ref={canvasRef}
			className="pointer-events-none absolute inset-0 h-full w-full"
		/>
	);
};
