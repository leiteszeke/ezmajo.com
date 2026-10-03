import { doReload } from '@agent/lib/reload';
import executeAbility from '@agent/workflows/abilities/tools/execute-ability';
import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

const ABILITY = 'imagify/optimize-media';
const STATUS_ABILITY = 'imagify/get-media-status';
const ACCOUNT_ABILITY = 'imagify/get-account';
const POLL_MS = 2000;
const GIVE_UP_MS = 60000;

// get-media-status rejects anything outside its own resolver keys.
const mediaInput = (inputs) => ({
	...(inputs?.media_id ? { media_id: inputs.media_id } : {}),
	...(inputs?.media_filename ? { media_filename: inputs.media_filename } : {}),
	...(inputs?.media_url ? { media_url: inputs.media_url } : {}),
});

const ask = async (ability, input) => {
	try {
		return await executeAbility({ ability, input });
	} catch {
		return null;
	}
};

// Imagify translates its own guard messages only where it has language packs.
const blockedMessage = (status) => {
	if (status === 'invalid_api_key')
		return __('Imagify needs a valid API key.', 'extendify-local');
	if (status === 'insufficient_quota')
		return __('Your Imagify quota is used up.', 'extendify-local');
	return null;
};

// Imagify files the real reason where no ability reads it back.
const failureReason = async () => {
	const account = await ask(ACCOUNT_ABILITY, {});
	if (!account) return null;
	if (account.is_api_key_valid === false)
		return blockedMessage('invalid_api_key');
	const spent = Number(account.consumed_current_month_quota ?? 0);
	const quota = Number(account.quota ?? 0);
	const extra = Number(account.extra_quota ?? 0);
	const extraSpent = Number(account.extra_quota_consumed ?? 0);
	if (quota && spent >= quota && extraSpent >= extra)
		return blockedMessage('insufficient_quota');
	return null;
};

const usePreview = (inputs, enabled) => {
	const [preview, setPreview] = useState(null);

	useEffect(() => {
		if (!enabled) return;
		let live = true;
		// Imagify runs nothing without confirm: true, so this only reports the cost.
		executeAbility({ ability: ABILITY, input: { ...inputs, confirm: false } })
			.then((result) => {
				if (live) setPreview(result ?? {});
			})
			// Imagify still gates the run, so a failed cost check need not block it.
			.catch(() => {
				if (live) setPreview({});
			});
		return () => {
			live = false;
		};
	}, [inputs, enabled]);

	return preview;
};

// Asked by name, the model sends only media_filename, which WP matches on title.
const mediaPath = ({ media_id: id, media_filename: filename }) => {
	if (id) return `/wp/v2/media/${id}`;
	if (filename)
		return addQueryArgs('/wp/v2/media', { search: filename, per_page: 1 });
	return null;
};

// Each turn remounts the card, and a fresh lookup would blank the thumbnail.
const resolved = new Map();

const useImageUrl = (inputs) => {
	// A turn re-sends inputs by value, so keying on the object never settles.
	const path = mediaPath(inputs ?? {});
	const [url, setUrl] = useState(
		inputs?.media_url ?? resolved.get(path) ?? null,
	);

	useEffect(() => {
		if (url || !path) return;
		let live = true;
		apiFetch({ path })
			.then((media) => {
				const found = Array.isArray(media) ? media[0] : media;
				if (found?.source_url) resolved.set(path, found.source_url);
				if (live) setUrl(found?.source_url ?? null);
			})
			.catch(() => {});
		return () => {
			live = false;
		};
	}, [path, url]);

	return url;
};

// A remount cancels the check, so without this the status never settles.
const observed = new Map();

const IDLE = { size: null, replaced: false, checked: false, failure: null };

const seededState = (url, originalSize) => {
	const length = observed.get(url);
	if (!length) return IDLE;
	return {
		...IDLE,
		size: length === originalSize ? null : length,
		checked: true,
	};
};

// Imagify answers once the job is queued, so the file is the only proof it ran.
const useOptimizedSize = (url, originalSize, enabled, mediaKey) => {
	const [state, setState] = useState(() => seededState(url, originalSize));
	const [unwatchable, setUnwatchable] = useState(false);

	useEffect(() => {
		if (!enabled || !url || !originalSize) return;
		let live = true;
		let timer;
		let seenOriginal = false;
		const startedAt = Date.now();
		const check = async () => {
			const response = await fetch(`${url}?extendify=${Date.now()}`, {
				method: 'HEAD',
				cache: 'no-store',
			}).catch(() => null);
			const length = Number(response?.headers?.get('content-length'));
			// A turn that cancels every check would otherwise record nothing.
			if (length) observed.set(url, length);
			if (!live) return;
			// Only a change we watched may reload; a remount would reload forever.
			if (length && length !== originalSize)
				return setState({
					...IDLE,
					size: length,
					replaced: seenOriginal,
					checked: true,
				});
			seenOriginal = seenOriginal || !!length;

			// The run answered at queue time, so only this reports a later failure.
			const status = await ask(STATUS_ABILITY, JSON.parse(mediaKey));
			if (!live) return;
			if (status?.status === 'error') {
				const reason = status.error_message || (await failureReason());
				if (!live) return;
				return setState({ ...IDLE, checked: true, failure: reason || '' });
			}
			if (status?.status === 'success' && status.optimized_size)
				return setState({
					...IDLE,
					size: status.optimized_size,
					replaced: seenOriginal,
					checked: true,
				});

			setState((current) =>
				current.checked ? current : { ...current, checked: true },
			);
			// A hidden length leaves only the status, and it did not answer either.
			if (!length && status?.status !== 'unoptimized')
				return setUnwatchable(true);
			if (Date.now() - startedAt > GIVE_UP_MS) return setUnwatchable(true);
			timer = setTimeout(check, POLL_MS);
		};
		// A reload of a finished run would otherwise claim to be working first.
		check();
		return () => {
			live = false;
			clearTimeout(timer);
		};
	}, [url, originalSize, enabled, mediaKey]);

	return { ...state, unwatchable };
};

const savingText = (original, optimized) =>
	sprintf(
		// translators: %s is how much smaller the optimized image is, e.g. "42%".
		__('Image optimized — %s smaller.', 'extendify-local'),
		`${Math.round(((original - optimized) / original) * 100)}%`,
	);

// Waiting on the lookup or on the decode would shift everything under it.
const Thumbnail = ({ url, optimizing }) => (
	<div className="h-24 w-24 overflow-hidden rounded-lg bg-gray-100">
		{url ? (
			<img
				src={url}
				alt={__('The image being optimized', 'extendify-local')}
				className={`m-0 h-full w-full object-cover transition-[filter] duration-500 ${optimizing ? 'blur-sm' : 'blur-none'}`}
			/>
		) : null}
	</div>
);

const Status = ({ pending, failed, children }) => (
	<p
		className={`m-0 p-0 text-start text-sm ${failed ? 'text-wp-alert-red' : 'text-gray-900'}`}
	>
		{pending ? <span className="status-animation">{children}</span> : children}
	</p>
);

const Cost = ({ preview }) => {
	const count = preview?.impact?.count ?? 1;
	const quota = preview?.quota_remaining;

	return (
		<>
			<Status>
				{sprintf(
					// translators: %d is how many Imagify credits optimizing this image will use.
					_n(
						'Optimizing this image uses %d Imagify credit.',
						'Optimizing this image uses %d Imagify credits.',
						count,
						'extendify-local',
					),
					count,
				)}
			</Status>
			{quota == null ? null : (
				<p className="m-0 mt-1 p-0 text-start text-sm text-gray-700">
					{sprintf(
						// translators: %s is the percentage of the user's Imagify quota that is still unused, e.g. "88%".
						__('%s of your quota remains.', 'extendify-local'),
						`${Math.round(quota)}%`,
					)}
				</p>
			)}
		</>
	);
};

export const OptimizeMedia = ({
	inputs,
	result,
	onConfirm,
	onCancel,
	live,
}) => {
	const gate = !!onConfirm && !result;
	const preview = usePreview(inputs, gate);
	const blocked = blockedMessage(preview?.status);
	const url = useImageUrl(inputs);

	const run = result?.[ABILITY] ?? {};
	const refused = result ? blockedMessage(run.status) : null;
	const failed = !!result && (result.error || run.status !== 'success');
	// A reoptimize answers with its own figures, so it has nothing left to watch.
	const queued = !!result && !refused && !failed && !run.optimized_size;
	const { size, replaced, unwatchable, checked, failure } = useOptimizedSize(
		url,
		run.original_size,
		queued && live,
		JSON.stringify(mediaInput(inputs)),
	);

	useEffect(() => {
		if (replaced) doReload();
	}, [replaced]);

	const watching =
		queued && live && checked && !unwatchable && !size && failure === null;
	const checking = queued && live && !checked && !unwatchable;
	const optimizing = watching || (!result && !gate);
	const pending = optimizing || checking || (gate && !preview);

	const wrong = !!refused || failed || failure !== null;

	const statusText = () => {
		if (refused) return refused;
		if (failed || failure !== null)
			return (
				failure || __("The image couldn't be optimized.", 'extendify-local')
			);
		if (run.optimized_size)
			return savingText(run.original_size, run.optimized_size);
		if (size) return savingText(run.original_size, size);
		if (!result)
			return gate
				? preview
					? blocked
					: __('Checking your Imagify quota...', 'extendify-local')
				: __('Optimizing image...', 'extendify-local');
		if (watching) return __('Optimizing image...', 'extendify-local');
		// The run may already be finished, so this must not say it is optimizing.
		if (checking) return __('Checking status...', 'extendify-local');
		return __(
			'Imagify is optimizing this image in the background.',
			'extendify-local',
		);
	};
	const message = statusText();

	return (
		<div className="mb-4 ms-2 me-2 flex flex-col gap-2">
			<Thumbnail url={url} optimizing={optimizing} />
			{message ? (
				<Status pending={pending} failed={wrong}>
					{message}
				</Status>
			) : null}
			{gate && preview && !blocked ? <Cost preview={preview} /> : null}
			{gate && preview ? (
				<div className="flex justify-start gap-2">
					<button
						type="button"
						className="w-full rounded-sm border border-gray-500 bg-white p-2 text-sm text-gray-900"
						onClick={onCancel}
					>
						{__('Cancel', 'extendify-local')}
					</button>
					{blocked ? null : (
						<button
							type="button"
							className="w-full rounded-sm border border-design-main bg-design-main p-2 text-sm text-white"
							onClick={() =>
								onConfirm({
									data: { ...inputs, confirm: true },
									shouldRefreshPage: false,
								})
							}
						>
							{__('Optimize image', 'extendify-local')}
						</button>
					)}
				</div>
			) : null}
		</div>
	);
};
