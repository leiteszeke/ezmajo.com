import { AI_HOST } from '@constants';
import { reqDataBasics } from '@shared/lib/data';
import useSWRImmutable from 'swr/immutable';

// The route never reads siteProfile, and the GET would put it in the query string.
const { siteProfile, ...basics } = reqDataBasics;

export const ACTIVATION_STATUS = {
	displayed: 'displayed',
	completed: 'completed',
	skipped: 'skipped',
};

export const ACCOUNT_STATUS = {
	pending: 'pending',
	success: 'success',
	error: 'error',
};

export const getPluginsScriptData = async ([slugs, ineligible]) => {
	const params = new URLSearchParams(slugs.map((slug) => ['plugins', slug]));
	for (const slug of ineligible) {
		params.append('ineligible', slug);
	}
	for (const [key, value] of Object.entries(basics)) {
		params.append(key, value);
	}

	const response = await fetch(`${AI_HOST}/api/plugins/activate?${params}`);
	return response.json();
};

export const patchActivation = async ({
	activationId,
	selectedPlugins,
	status,
	context,
}) => {
	// Losing this record must not cost the account it was recording.
	await fetch(`${AI_HOST}/api/plugins/activate`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			...basics,
			activationId,
			selectedPlugins,
			status,
			context,
		}),
		// The copy invites closing the window; the settled write has to outlive it.
		keepalive: true,
	}).catch(() => {});
};

export const usePluginsActivation = (plugins, ineligible = []) => {
	const slugs = plugins.map((plugin) => plugin.slug);
	// SWR skips an empty-array key, which would lose the record for an all-ineligible site.
	const {
		data,
		isLoading: loading,
		error,
	} = useSWRImmutable([slugs, ineligible], getPluginsScriptData);
	const { activationId, ...scriptData } = data ?? {};

	const selectedPlugins = plugins
		.filter((plugin) => plugin.selected)
		.map((plugin) => plugin.slug);

	const activatePlugins = ({ status, context = undefined }) =>
		patchActivation({ activationId, selectedPlugins, status, context });

	return { scriptData, activatePlugins, loading, error };
};
