const siteLocale = () => window.extSharedData?.wpLanguage?.replace('_', '-');

const RTL_LANGUAGES = new Set(['ar', 'ary', 'fa', 'he', 'ur']);

// Already all-caps in the site's locale; casing it here would break Turkish and Greek.
const aiLabelText = () => window.extSharedData?.aiImageLabel ?? 'AI GENERATED';

const setPillFont = (ctx, fontSize) => {
	ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
	// Older engines lack tracking; the label still reads without it.
	if ('letterSpacing' in ctx) ctx.letterSpacing = `${fontSize * 0.06}px`;
	// A Hebrew label with a Latin run inside orders wrongly under an ltr base.
	const language = (siteLocale() || '').split('-')[0].toLowerCase();
	ctx.direction = RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';
};

const pillSize = (ctx, fontSize, label) => {
	setPillFont(ctx, fontSize);
	return {
		width: ctx.measureText(label).width + fontSize * 1.2,
		height: fontSize * 1.7,
	};
};

const pillPath = (ctx, x, y, width, height) => {
	const radius = height / 2;
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.arcTo(x + width, y, x + width, y + height, radius);
	ctx.arcTo(x + width, y + height, x, y + height, radius);
	ctx.arcTo(x, y + height, x, y, radius);
	ctx.arcTo(x, y, x + width, y, radius);
	ctx.closePath();
};

const pillLineWidth = (fontSize) => Math.max(1, fontSize / 12);

const drawPill = (ctx, x, y, fontSize) => {
	const label = aiLabelText();
	const { width, height } = pillSize(ctx, fontSize, label);
	const lineWidth = pillLineWidth(fontSize);
	pillPath(ctx, x, y, width, height);
	ctx.fillStyle = '#1a1a1a';
	ctx.fill();
	// A centered stroke would eat half the border out of the fill box.
	pillPath(
		ctx,
		x - lineWidth / 2,
		y - lineWidth / 2,
		width + lineWidth,
		height + lineWidth,
	);
	ctx.lineWidth = lineWidth;
	ctx.strokeStyle = '#fff';
	ctx.stroke();
	ctx.fillStyle = '#fff';
	ctx.textAlign = 'center';
	const metrics = ctx.measureText(label);
	const { actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent } =
		metrics;
	if (ascent === undefined || descent === undefined) {
		ctx.textBaseline = 'middle';
		ctx.fillText(label, x + width / 2, y + height / 2);
		return;
	}
	// The 'middle' baseline centers the em box, which sits the glyphs too high.
	ctx.textBaseline = 'alphabetic';
	ctx.fillText(label, x + width / 2, y + height / 2 + (ascent - descent) / 2);
};

// Beyond 87.5% our narrowest crop, a 3:4 cover, eats the label.
const PILL_RIGHT_EDGE = 0.85;

export const stampAiLabel = (ctx, width, height) => {
	const fontSize = Math.max(12, Math.round(Math.min(width, height) * 0.02));
	const pill = pillSize(ctx, fontSize, aiLabelText());
	drawPill(
		ctx,
		width * PILL_RIGHT_EDGE - pill.width - pillLineWidth(fontSize),
		(height - pill.height) / 2,
		fontSize,
	);
};

// GD on the server has no font for the localized label; ship it a rendered PNG.
export const renderAiLabelPill = async () => {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;
	const fontSize = 48;
	// Below the line width, the border clips at the bitmap edge.
	const margin = Math.ceil(fontSize / 12);
	const { width, height } = pillSize(ctx, fontSize, aiLabelText());
	canvas.width = Math.ceil(width) + margin * 2;
	canvas.height = Math.ceil(height) + margin * 2;
	drawPill(ctx, margin, margin, fontSize);
	return await new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob), 'image/png');
	});
};

export const stampImageBlob = async (imageUrl) => {
	try {
		const image = new Image();
		image.crossOrigin = 'anonymous';
		const loaded = new Promise((resolve, reject) => {
			image.onload = () => resolve(image);
			image.onerror = reject;
		});
		image.src = imageUrl;
		await loaded;
		const canvas = document.createElement('canvas');
		canvas.width = image.naturalWidth || image.width;
		canvas.height = image.naturalHeight || image.height;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;
		ctx.drawImage(image, 0, 0);
		stampAiLabel(ctx, canvas.width, canvas.height);
		return await new Promise((resolve) => {
			canvas.toBlob((blob) => resolve(blob), 'image/jpeg');
		});
	} catch {
		return null;
	}
};
