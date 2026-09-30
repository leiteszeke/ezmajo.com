const data = () => window.extQuickEditData || {};

export const post = async (path, body) => {
	const { restRoot, nonce } = data();
	const res = await fetch(`${restRoot}${path}`, {
		method: 'POST',
		credentials: 'same-origin',
		headers: {
			'Content-Type': 'application/json',
			'X-WP-Nonce': nonce,
		},
		body: JSON.stringify(body),
	});
	const json = await res.json().catch(() => ({}));
	if (!res.ok) {
		const err = new Error(json?.message || json?.error || `HTTP ${res.status}`);
		err.status = res.status;
		err.body = json;
		throw err;
	}
	return json;
};

// The REST save request isn't language-scoped the way the page render is, so
// forward the context detected at enqueue. The server refuses text-bearing
// saves when it says translated — failing the corruption path closed even when
// no fingerprint is sent — and ignores it for image / non-text saves.
export const save = (payload) =>
	post('/quick-edit/save', {
		...payload,
		translatedContext: data().translatedContext ?? null,
	});

export const get = async (path) => {
	const { restRoot, nonce } = data();
	const res = await fetch(`${restRoot}${path}`, {
		method: 'GET',
		credentials: 'same-origin',
		headers: { 'X-WP-Nonce': nonce },
	});
	const json = await res.json().catch(() => ({}));
	if (!res.ok) {
		const err = new Error(json?.message || json?.error || `HTTP ${res.status}`);
		err.status = res.status;
		err.body = json;
		throw err;
	}
	return json;
};

// Identity (title/tagline/logo) lives in wp_options, not post_content,
// so it bypasses save().
export const saveSiteIdentity = (payload) =>
	post('/quick-edit/site-identity', payload);

export const loadSiteIdentity = () => get('/quick-edit/site-identity');

export const loadProduct = (productId) =>
	get(`/quick-edit/product?product_id=${encodeURIComponent(productId)}`);

export const saveProduct = ({ productId, field, value }) =>
	post('/quick-edit/product', { product_id: productId, field, value });

// Ref-based nav items live in a separate wp_navigation CPT, out of reach
// of /quick-edit/save's findBlock walk.
export const saveWpNavigationItem = ({
	navPostId,
	itemIndex,
	blockType,
	patches,
	fingerprint,
}) =>
	post('/quick-edit/wp-navigation', {
		navPostId,
		itemIndex,
		blockType,
		patches,
		fingerprint,
	});

export const loadWpFormsField = ({ formId, fieldId }) =>
	get(
		`/quick-edit/wpforms?form_id=${encodeURIComponent(formId)}` +
			`&field_id=${encodeURIComponent(fieldId)}`,
	);

export const saveWpFormsField = ({ formId, fieldId, changes }) =>
	post('/quick-edit/wpforms', {
		form_id: formId,
		field_id: fieldId,
		changes,
	});
