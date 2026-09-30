/**
 * Authoring contract: `vec4 render(vec2 uv, float t)`, with everything in
 * PRELUDE in scope. `uv` is centered and normalized by the shorter axis, `t` is
 * seconds already scaled by the speed token. The canvas is transparent, so a
 * shader only paints what it wants over the page color.
 */

// The one shader the flow draws when a design names none.
export const DEFAULT_SHADER = `vec4 render(vec2 uv, float t) {
	vec2 drift = vec2(sin(t * 0.26), cos(t * 0.26));
	float dist = length(uv - drift * 0.55);
	float falloff = smoothstep(0.95 * u_scale, 0.0, dist);
	return vec4(u_color1, falloff * 0.32 * u_intensity);
}`;

const VERTEX = `#version 300 es
in vec2 a_position;
void main() {
	gl_Position = vec4(a_position, 0.0, 1.0);
}`;

export const PRELUDE = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_offset;
uniform float u_time;
uniform float u_speed;
uniform float u_scale;
uniform float u_intensity;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform sampler2D u_prev;
uniform float u_frame;

out vec4 fragColor;

vec2 screenUV() {
	return gl_FragCoord.xy / u_resolution;
}

// The frame before this one: alpha is the shader's state, so Intensity is
// applied on the way to the screen and not by the shader.
vec4 prev(vec2 at) {
	return texture(u_prev, at);
}

float hash21(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
		mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
		u.y
	);
}

float fbm(vec2 p) {
	float total = 0.0;
	float amplitude = 0.5;
	for (int i = 0; i < 5; i++) {
		total += noise(p) * amplitude;
		p *= 2.0;
		amplitude *= 0.5;
	}
	return total;
}
`;

const MAIN = `
void main() {
	vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y) - u_offset;
	fragColor = render(uv, u_time * u_speed);
}
`;

const UNIFORMS = [
	'u_resolution',
	'u_offset',
	'u_time',
	'u_speed',
	'u_scale',
	'u_intensity',
	'u_color1',
	'u_color2',
	'u_color3',
	'u_prev',
	'u_frame',
];

// A board held between frames runs at cell resolution, not at canvas resolution.
const BOARD_COLUMNS = 90;

const COPY_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_source;
uniform vec2 u_resolution;
uniform vec2 u_offset;
uniform float u_intensity;
out vec4 fragColor;
void main() {
	fragColor = texture(u_source, gl_FragCoord.xy / u_resolution - u_offset) * vec4(1.0, 1.0, 1.0, u_intensity);
}
`;

// Full resolution: at half, a point-sized detail upscales into a smudge.
const RENDER_SCALE = 1;
const MAX_FPS = 30;
// No static check proves a shader is cheap enough for a given GPU, so watch it run.
const SLOW_FRAME_MS = (1000 / MAX_FPS) * 4;
const SLOW_FRAME_LIMIT = 30;

const compile = (gl, type, source) => {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return { shader };
	const log = gl.getShaderInfoLog(shader);
	gl.deleteShader(shader);
	return { error: log || 'Shader failed to compile.' };
};

export const createShaderCanvas = (canvas) => {
	const gl = canvas.getContext('webgl2', {
		alpha: true,
		antialias: false,
		depth: false,
		stencil: false,
		premultipliedAlpha: false,
		powerPreference: 'low-power',
	});
	if (!gl) return null;

	const quad = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, quad);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 3, -1, -1, 3]),
		gl.STATIC_DRAW,
	);

	let program = null;
	let locations = {};
	let board = null;
	let copy = null;
	let frames = 0;
	let frame = null;
	let lastDraw = 0;
	let paused = false;
	let still = false;
	let slowFrames = 0;
	const start = performance.now();
	let values = {
		speed: 1,
		scale: 1,
		intensity: 1,
		offset: [0, 0],
		colors: [
			[1, 1, 1],
			[1, 1, 1],
			[1, 1, 1],
		],
	};

	const buildProgram = (fragmentSource) => {
		const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
		const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
		if (vertex.error || fragment.error) {
			return { error: vertex.error || fragment.error };
		}
		const next = gl.createProgram();
		gl.attachShader(next, vertex.shader);
		gl.attachShader(next, fragment.shader);
		gl.bindAttribLocation(next, 0, 'a_position');
		gl.linkProgram(next);
		gl.deleteShader(vertex.shader);
		gl.deleteShader(fragment.shader);
		if (gl.getProgramParameter(next, gl.LINK_STATUS)) return { program: next };
		const log = gl.getProgramInfoLog(next);
		gl.deleteProgram(next);
		return { error: log || 'Shader failed to link.' };
	};

	// Wrapped, so a shape leaving one edge of the board arrives at the other.
	const makeSurface = (width, height) => {
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			width,
			height,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			null,
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		const buffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			texture,
			0,
		);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		return { texture, buffer };
	};

	const dropBoard = () => {
		if (!board) return;
		for (const surface of board.surfaces) {
			gl.deleteTexture(surface.texture);
			gl.deleteFramebuffer(surface.buffer);
		}
		board = null;
	};

	// Scale is the cell size, so changing it or the canvas starts the board over.
	const ensureBoard = () => {
		const columns = Math.round(
			Math.min(260, Math.max(24, BOARD_COLUMNS * values.scale)),
		);
		const rows = Math.max(
			1,
			Math.round((columns * canvas.height) / Math.max(canvas.width, 1)),
		);
		if (board && board.width === columns && board.height === rows) return;
		dropBoard();
		board = {
			width: columns,
			height: rows,
			surfaces: [makeSurface(columns, rows), makeSurface(columns, rows)],
			index: 0,
		};
		frames = 0;
	};

	const resize = () => {
		const dpr = Math.min(window.devicePixelRatio || 1, 2) * RENDER_SCALE;
		const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
		const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
		if (canvas.width === width && canvas.height === height) return;
		canvas.width = width;
		canvas.height = height;
		gl.viewport(0, 0, width, height);
	};

	const setUniforms = (width, height) => {
		gl.uniform2f(locations.u_resolution, width, height);
		gl.uniform1f(
			locations.u_time,
			still ? 0 : (performance.now() - start) / 1000,
		);
		gl.uniform1f(locations.u_speed, values.speed);
		gl.uniform1f(locations.u_scale, values.scale);
		gl.uniform1f(locations.u_intensity, values.intensity);
		gl.uniform2f(locations.u_offset, values.offset[0], values.offset[1]);
		gl.uniform3fv(locations.u_color1, values.colors[0]);
		gl.uniform3fv(locations.u_color2, values.colors[1]);
		gl.uniform3fv(locations.u_color3, values.colors[2]);
		gl.uniform1f(locations.u_frame, frames);
	};

	// Intensity lands on the copy: the shader spends its alpha carrying state.
	const drawBoard = () => {
		ensureBoard();
		const read = board.surfaces[board.index];
		const write = board.surfaces[1 - board.index];

		gl.bindFramebuffer(gl.FRAMEBUFFER, write.buffer);
		gl.viewport(0, 0, board.width, board.height);
		// biome-ignore lint/correctness/useHookAtTopLevel: WebGL, not a React hook.
		gl.useProgram(program);
		setUniforms(board.width, board.height);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, read.texture);
		gl.uniform1i(locations.u_prev, 0);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		// biome-ignore lint/correctness/useHookAtTopLevel: WebGL, not a React hook.
		gl.useProgram(copy.program);
		gl.uniform2f(copy.resolution, canvas.width, canvas.height);
		gl.uniform2f(copy.offset, values.offset[0], values.offset[1]);
		gl.uniform1f(copy.intensity, values.intensity);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, write.texture);
		gl.uniform1i(copy.source, 0);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		board.index = 1 - board.index;
		frames += 1;
	};

	const draw = () => {
		if (!program) return;
		resize();
		if (copy) {
			drawBoard();
			return;
		}
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		// biome-ignore lint/correctness/useHookAtTopLevel: WebGL, not a React hook.
		gl.useProgram(program);
		setUniforms(canvas.width, canvas.height);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		frames += 1;
	};

	const loop = (now) => {
		frame = requestAnimationFrame(loop);
		if (paused || still) return;
		if (now - lastDraw < 1000 / MAX_FPS) return;
		// First frame has no interval to measure, and would read as a stall.
		const elapsed = lastDraw ? now - lastDraw : 0;
		lastDraw = now;
		draw();

		slowFrames = elapsed > SLOW_FRAME_MS ? slowFrames + 1 : 0;
		if (slowFrames < SLOW_FRAME_LIMIT) return;
		// Freezing keeps the look the partner chose; an error would reach nobody.
		still = true;
	};

	const ensureCopy = () => {
		if (copy) return true;
		const built = buildProgram(COPY_FRAGMENT);
		if (built.error) return false;
		copy = {
			program: built.program,
			source: gl.getUniformLocation(built.program, 'u_source'),
			resolution: gl.getUniformLocation(built.program, 'u_resolution'),
			offset: gl.getUniformLocation(built.program, 'u_offset'),
			intensity: gl.getUniformLocation(built.program, 'u_intensity'),
		};
		return true;
	};

	const dropCopy = () => {
		if (!copy) return;
		gl.deleteProgram(copy.program);
		copy = null;
		dropBoard();
	};

	const setSource = (body) => {
		const built = buildProgram(PRELUDE + body + MAIN);
		if (built.error) return false;

		// Only a shader that reads the frame before pays for the second pass.
		const held = /\bprev\s*\(/.test(body);
		if (held && !ensureCopy()) {
			gl.deleteProgram(built.program);
			return false;
		}
		if (!held) dropCopy();

		if (program) gl.deleteProgram(program);
		program = built.program;
		frames = 0;
		locations = Object.fromEntries(
			UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)]),
		);
		// biome-ignore lint/correctness/useHookAtTopLevel: WebGL, not a React hook.
		gl.useProgram(program);
		gl.enableVertexAttribArray(0);
		gl.bindBuffer(gl.ARRAY_BUFFER, quad);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		slowFrames = 0;
		draw();
		return true;
	};

	const setValues = (next) => {
		values = { ...values, ...next };
		if (still || paused) draw();
	};

	// Reduced motion gets one frame rather than a blank background.
	const setStill = (value) => {
		still = value;
		if (value) draw();
	};

	const controller = new AbortController();
	const { signal } = controller;
	document.addEventListener(
		'visibilitychange',
		() => {
			paused = document.hidden;
		},
		{ signal },
	);
	canvas.addEventListener(
		'webglcontextlost',
		(event) => {
			event.preventDefault();
			paused = true;
		},
		{ signal },
	);

	frame = requestAnimationFrame(loop);

	return {
		setSource,
		setValues,
		setStill,
		destroy() {
			controller.abort();
			if (frame) cancelAnimationFrame(frame);
			if (program) gl.deleteProgram(program);
			dropCopy();
			gl.deleteBuffer(quad);
			gl.getExtension('WEBGL_lose_context')?.loseContext();
		},
	};
};
