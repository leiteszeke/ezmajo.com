import executeAbility from '@agent/workflows/abilities/tools/execute-ability';
import { useEffect, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';

const ABILITY = 'imagify/optimize-media';

// Imagify translates its own guard messages only where it has language packs.
const blockedMessage = (status) => {
	if (status === 'invalid_api_key')
		return __(
			'Your Imagify API key is missing or invalid. Add a valid key in the Imagify settings.',
			'extendify-local',
		);
	if (status === 'insufficient_quota')
		return __(
			'Your Imagify quota is used up. Wait for the next reset or upgrade your plan.',
			'extendify-local',
		);
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

const Line = ({ children }) => (
	<p className="m-0 p-0 text-sm text-gray-900">{children}</p>
);

const Cost = ({ preview }) => {
	const count = preview?.impact?.count ?? 1;
	const quota = preview?.quota_remaining;

	return (
		<>
			<Line>
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
			</Line>
			{quota == null ? null : (
				<p className="m-0 mt-1 p-0 text-sm text-gray-700">
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

const Body = ({ gate, preview, blocked, result }) => {
	if (result) {
		const failed = result.error || result[ABILITY]?.status === 'error';
		return (
			<Line>
				{failed
					? __("The image couldn't be optimized.", 'extendify-local')
					: __('Image optimized.', 'extendify-local')}
			</Line>
		);
	}
	if (!gate) return <Line>{__('Optimizing image...', 'extendify-local')}</Line>;
	if (!preview)
		return (
			<Line>{__('Checking your Imagify quota...', 'extendify-local')}</Line>
		);
	if (blocked) return <Line>{blocked}</Line>;
	return <Cost preview={preview} />;
};

export const OptimizeMedia = ({ inputs, result, onConfirm, onCancel }) => {
	const gate = !!onConfirm && !result;
	const preview = usePreview(inputs, gate);
	const blocked = blockedMessage(preview?.status);

	return (
		<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
			<div className="rounded-lg border-b border-gray-300 bg-white p-3">
				<Body gate={gate} preview={preview} blocked={blocked} result={result} />
			</div>
			{gate && preview ? (
				<div className="flex justify-start gap-2 p-3">
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
							onClick={() => onConfirm({ data: { ...inputs, confirm: true } })}
						>
							{__('Optimize image', 'extendify-local')}
						</button>
					)}
				</div>
			) : null}
		</div>
	);
};
