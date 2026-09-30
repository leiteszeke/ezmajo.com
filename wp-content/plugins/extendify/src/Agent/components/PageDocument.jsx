import { findBlockEl, scopeOf } from '@agent/lib/block-el';
import { buildSubtreeManifest } from '@agent/lib/subtree-manifest';
import { useQuickEditStore } from '@quick-edit/state/store';
import { useMemo } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { close, Icon } from '@wordpress/icons';
import classNames from 'classnames';

export const PageDocument = ({ busy }) => {
	const setBlock = useQuickEditStore((s) => s.setAgentBlock);
	const block = useQuickEditStore((s) => s.agentBlock);

	// The same manifest the agent works from, so the count matches what it
	// can actually address — not every node in the subtree.
	const count = useMemo(() => {
		if (!block?.id) return 1;
		const node = findBlockEl(block.id, document, scopeOf(block));
		return Math.max(node ? buildSubtreeManifest(node).length : 1, 1);
	}, [block]);

	return (
		// The input darkens to gray-300 while disabled; a gray-200 chip vanishes into it.
		<div
			className={classNames(
				'flex w-fit max-w-full items-center gap-1 whitespace-nowrap rounded-sm py-1.5 pe-1.5 ps-2.5 text-xs leading-tight',
				{
					'bg-gray-100 text-gray-600': busy,
					'bg-gray-200 text-gray-900': !busy,
				},
			)}
		>
			<span className="truncate">
				{sprintf(
					// translators: %d is the number of blocks the user selected on the page.
					_n(
						'%d block selected',
						'%d blocks selected',
						count,
						'extendify-local',
					),
					count,
				)}
			</span>
			{/* Stays mounted while disabled: dropping it reflows the chip mid-run. */}
			<button
				type="button"
				disabled={busy}
				className="flex shrink-0 items-center rounded-none border-0 bg-transparent p-0 outline-hidden ring-design-main focus:shadow-none focus:outline-hidden focus-visible:outline-design-main disabled:cursor-not-allowed disabled:opacity-40"
				onClick={() => setBlock(null)}
			>
				<Icon
					className="pointer-events-none fill-current leading-none"
					icon={close}
					size={16}
				/>
				<span className="sr-only">{__('Remove', 'extendify-local')}</span>
			</button>
		</div>
	);
};
