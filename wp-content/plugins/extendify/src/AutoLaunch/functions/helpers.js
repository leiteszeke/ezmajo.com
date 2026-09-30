import { useLaunchDataStore } from '@auto-launch/state/launch-data';
import { digest } from '@shared/api/digest';

export const setStatus = (msg) => {
	useLaunchDataStore.getState().addStatusMessage(msg);
};
export const setErrorMessage = (message) => {
	useLaunchDataStore.getState().setErrorMessage(message);
};

export const retryTwice = async (fn) => {
	try {
		return await fn();
	} catch (_) {
		setErrorMessage(
			// translators: This is an error message shown to the user when a network request fails and is being retried
			launchStrings().errorUnstable,
		);
		await wait(1000);
		const res = await fn();
		setErrorMessage(null);
		return res;
	}
};

export const failWithFallback = async (fn, fallback, errDetails = {}) => {
	try {
		return await fn();
	} catch (error) {
		digest({
			...errDetails,
			error: errDetails?.error ?? error,
			source: 'auto-launch',
		});
		return fallback;
	}
};

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

import { launchStrings } from '@auto-launch/strings';
import apiFetch from '@wordpress/api-fetch';

export async function apiFetchWithTimeout(options = {}, timeoutMs = 30000) {
	const controller = new AbortController();
	const { signal } = controller;
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		return await apiFetch({ ...options, signal });
	} finally {
		clearTimeout(timeoutId);
	}
}
export const fetchWithTimeout = async (
	url,
	options = {},
	timeoutMs = 60000,
) => {
	const controller = new AbortController();
	const { signal } = controller;
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		return await fetch(url, { ...options, signal });
	} finally {
		clearTimeout(timeoutId);
	}
};
