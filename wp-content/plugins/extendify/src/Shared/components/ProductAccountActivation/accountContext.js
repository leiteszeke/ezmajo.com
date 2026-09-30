import { reqDataBasics } from '@shared/lib/data';
import { ACCOUNT_STATUS } from './usePluginsActivation';

// PHP finishes the account after the browser stops waiting, so unanswered is not failed.
const rejectionStatus = ([error]) =>
	error?.code === 'fetch_error' && !error.httpStatus && !error.timedOut
		? ACCOUNT_STATUS.pending
		: ACCOUNT_STATUS.error;

const outcome = (result) => {
	if (!result) {
		return { status: ACCOUNT_STATUS.pending };
	}

	const {
		requestTimeInMs,
		captchaTimeInMs,
		captchaWasWarm,
		stepTimeInMs,
		retries,
		errors,
	} = result.status === 'fulfilled' ? result.value : result.reason;

	return {
		status:
			result.status === 'fulfilled'
				? ACCOUNT_STATUS.success
				: rejectionStatus(errors),
		requestTimeInMs,
		captchaTimeInMs,
		captchaWasWarm,
		stepTimeInMs,
		retries,
		...(errors.length > 0 && { errors }),
	};
};

export const accountContext = (selectedPlugins, results) =>
	Object.fromEntries(
		selectedPlugins.map((plugin, index) => [
			plugin.slug,
			{
				endpoint: plugin.endpoint,
				// Reporting slices per entry, so the body's top-level version won't do.
				extendifyVersion: reqDataBasics.version,
				...outcome(results?.[index]),
			},
		]),
	);
