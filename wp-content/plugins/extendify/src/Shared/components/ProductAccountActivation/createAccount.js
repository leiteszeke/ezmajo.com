const describeError = (error, signal) => ({
	message: error?.message,
	code: error?.code,
	data: error?.data,
	httpStatus: error?.httpStatus,
	// api-fetch collapses our AbortSignal.timeout into a generic fetch_error.
	timedOut: signal.aborted,
});

export const createAccount = async (plugin, data) => {
	const signal = AbortSignal.timeout(55000);
	const timings = {};
	const attemptStart = Date.now();

	try {
		const body = await plugin.createAccountCallback({
			...data,
			endpoint: plugin.endpoint,
			signal,
			timings,
		});

		return {
			requestTimeInMs: [Date.now() - attemptStart],
			captchaTimeInMs: timings.captchaTimeInMs,
			captchaWasWarm: timings.captchaWasWarm,
			stepTimeInMs: body?.stepTimeInMs,
			retries: 0,
			errors: [],
		};
	} catch (error) {
		const err = new Error('Account creation failed');

		err.requestTimeInMs = [Date.now() - attemptStart];
		err.captchaTimeInMs = timings.captchaTimeInMs;
		err.captchaWasWarm = timings.captchaWasWarm;
		err.stepTimeInMs = error?.stepTimeInMs;
		err.retries = 0;
		err.errors = [describeError(error, signal)];

		throw err;
	}
};
