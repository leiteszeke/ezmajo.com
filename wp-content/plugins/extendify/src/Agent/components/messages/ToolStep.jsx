import { decodeEntities } from '@wordpress/html-entities';
import { chevronRightSmall, Icon } from '@wordpress/icons';

// A started label reads as still running, so a finished step drops its dots.
const stepText = ({ label, started }) =>
	decodeEntities(label || started.replace(/\s*(\.\.\.|…)$/, ''));

const resultText = (result) =>
	typeof result === 'string' ? result : JSON.stringify(result, null, 2);

// highlightAll clears every block it painted, so each call covers them all.
const SELECTOR = 'pre > code.language-json';

export const highlightToolSteps = (root) => {
	// Without the Custom Highlight API the JSON stays plain text.
	if (!window.CSS?.highlights || !root?.querySelector(SELECTOR)) return;
	import('microlighter')
		.then(({ highlightAll }) => highlightAll({ root, selector: SELECTOR }))
		.catch(() => {});
};

export const ToolStep = ({ details }) => {
	if (details.result === undefined) {
		return (
			<div className="mb-2 ms-2 me-2 ps-5 text-sm text-gray-700">
				{stepText(details)}
			</div>
		);
	}
	return (
		<details className="group mb-2 ms-2 me-2 text-sm text-gray-700">
			<summary className="flex w-fit cursor-pointer list-none items-center gap-0.5 hover:text-gray-900 [&::-webkit-details-marker]:hidden">
				<Icon
					icon={chevronRightSmall}
					size={20}
					className="fill-current transition-transform group-open:rotate-90 rtl:-scale-x-100"
				/>
				<span>{stepText(details)}</span>
			</summary>
			<pre className="m-0 mt-1 max-h-[200px] overflow-auto whitespace-pre-wrap break-words rounded-sm bg-gray-100 p-2 font-mono text-xs text-gray-800">
				<code
					className={
						typeof details.result === 'string' ? undefined : 'language-json'
					}
				>
					{resultText(details.result)}
				</code>
			</pre>
		</details>
	);
};
