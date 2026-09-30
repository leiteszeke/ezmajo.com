import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

let recaptchaReady;
const loadRecaptcha = () => {
	recaptchaReady ??= new Promise((resolve, reject) => {
		const ready = () => window.grecaptcha.enterprise.ready(resolve);
		if (window.grecaptcha?.enterprise) {
			ready();
			return;
		}

		const existing = document.querySelector(
			'script[src*="recaptcha/enterprise"]',
		);
		if (existing) {
			existing.addEventListener('load', ready);
			return;
		}

		const script = document.createElement('script');
		script.src =
			'https://www.google.com/recaptcha/enterprise.js?render=explicit';
		script.async = true;
		script.onload = ready;
		script.onerror = () => {
			// A cached rejection would block every retry.
			recaptchaReady = undefined;
			reject(new Error('Failed to load the reCAPTCHA script'));
		};
		document.head.appendChild(script);
	});
	return recaptchaReady;
};

// enterprise.js can't load twice, and execute() needs a rendered site key —
// one widget per key.
const recaptchaWidgets = new Map();
const renderedKeys = new Set();

const renderWidget = async (siteKey) => {
	await loadRecaptcha();

	const container = document.createElement('div');
	document.body.appendChild(container);
	const widget = window.grecaptcha.enterprise.render(container, {
		sitekey: siteKey,
		size: 'invisible',
	});
	renderedKeys.add(siteKey);

	return widget;
};

// Keeps the script load and the widget render off the click's deadline.
export const prewarmRecaptcha = (siteKey) => {
	if (!recaptchaWidgets.has(siteKey)) {
		const widget = renderWidget(siteKey);
		widget.catch(() => recaptchaWidgets.delete(siteKey));
		recaptchaWidgets.set(siteKey, widget);
	}
	return recaptchaWidgets.get(siteKey);
};

const getRecaptchaToken = async (action, siteKey, timings = {}) => {
	if (!siteKey) {
		throw new Error(`No reCAPTCHA site key for the ${action} action`);
	}

	timings.captchaWasWarm = renderedKeys.has(siteKey);
	const start = Date.now();

	try {
		const widget = await prewarmRecaptcha(siteKey);

		// Without await, finally runs before execute settles and records ~0ms.
		return await window.grecaptcha.enterprise.execute(widget, { action });
	} finally {
		timings.captchaTimeInMs = Date.now() - start;
	}
};

// api-fetch throws the parsed body and drops the Response, so parse:false is the only way to keep the status.
const post = async (options) => {
	try {
		const response = await apiFetch({
			...options,
			method: 'POST',
			parse: false,
		});
		return await response.json().catch(() => undefined);
	} catch (error) {
		if (typeof error?.json !== 'function') throw error;

		const body = await error.json().catch(() => ({ code: 'invalid_json' }));
		throw { ...body, httpStatus: error.status };
	}
};

const createAccount = ({
	endpoint,
	email,
	marketingConsent,
	termsAgreed,
	signal,
	scriptData,
}) =>
	post({
		path: endpoint,
		data: {
			email,
			marketingConsent,
			termsAgreed,
			...scriptData,
		},
		signal,
	});

/*
 * Plugin entries shape:
 *   createAccountCallback: (data) => Promise<body> — performs the account creation request
 *   data.endpoint: the route PHP registered        — requesting and recording must not drift
 *   data.timings: out-param                        — write the captcha timings here; they survive a throw
 */
export const pluginsActivation = {
	simplybook: {
		createAccountCallback: async ({
			scriptData,
			endpoint,
			email,
			marketingConsent,
			termsAgreed,
			signal,
			timings,
		}) => {
			const captchaToken = await getRecaptchaToken(
				scriptData?.recaptchaAction,
				scriptData?.recaptchaSiteKey,
				timings,
			);

			// Hit the endpoint via ?rest_route= so the request URL contains "simplybook" —
			// SimplyBook only registers its onboarding routes when it does, else they 404.
			const url = addQueryArgs(`${window.extSharedData.homeUrl}/`, {
				rest_route: `/${endpoint}`,
			});

			return post({
				url,
				data: {
					email,
					marketingConsent,
					termsAgreed,
					captcha_token: captchaToken,
				},
				signal,
			});
		},
	},
	'translatepress-multilingual': {
		createAccountCallback: createAccount,
	},
	imagify: {
		createAccountCallback: createAccount,
	},
	metricool: {
		createAccountCallback: async ({
			scriptData,
			endpoint,
			email,
			marketingConsent,
			termsAgreed,
			signal,
			timings,
		}) => {
			const captchaToken = await getRecaptchaToken(
				scriptData?.recaptchaAction,
				scriptData?.recaptchaSiteKey,
				timings,
			);

			return post({
				path: endpoint,
				data: {
					email,
					marketingConsent,
					termsAgreed,
					captcha_token: captchaToken,
				},
				signal,
			});
		},
	},
};
