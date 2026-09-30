import classNames from 'classnames';

// Covers the viewport: blurring one region leaves four hard edges mid-page.
const OVERLAY = [
	'fixed inset-0 z-20 overflow-y-auto p-6',
	// Drawn outside the page canvas, so the type it sets never reaches here.
	'text-ui-body font-ui-body',
	'[backdrop-filter:blur(var(--ext-ui-wait-blur,6px))]',
].join(' ');

// min-h-full, or a box taller than the viewport centres its overflow out of reach.
const CENTERING = 'flex min-h-full items-center justify-center';

const BOX = 'flex flex-col [gap:var(--ext-tpl-modal-gap,12px)]';

// Stretched either way, or a shrink-wrapped heading has no room to move.
const CENTER = 'items-stretch [text-align:var(--ext-tpl-modal-align,center)]';

const LEFT = 'items-stretch [text-align:var(--ext-tpl-modal-align,left)]';

// The one template allowed off the shared card, so an interruption can differ.
const CARD_BOX = [
	'border-solid shadow-ui',
	'[border-radius:var(--ext-tpl-modal-radius,var(--radius-ui-card))]',
	// Floating over a blurred page, the overlay needs an edge the cards can skip.
	'[border-width:var(--ext-tpl-modal-border,max(1px,var(--ext-ui-border-width,1px)))]',
	'[border-color:var(--ext-tpl-modal-line,var(--color-ui-line))]',
	// An overlay that lets the page through is not covering anything, so the
	// shared surface is taken before its opacity is mixed in.
	'[background:var(--ext-tpl-modal-surface,var(--ext-ui-surface,#f0f0f0))]',
	// Every part inside paints by these tokens, the icons included.
	'[--color-ui-ink:var(--ext-tpl-modal-text,var(--ui-base-ink))]',
	'[--color-ui-action:var(--ext-tpl-modal-action,var(--ui-base-action))]',
	'[--color-ui-action-text:var(--ext-tpl-modal-action-text,var(--ui-base-action-text))]',
	'[--color-ui-secondary-fill:var(--ext-tpl-modal-secondary-fill,var(--ui-base-secondary-fill))]',
	'[--color-ui-secondary-line:var(--ext-tpl-modal-secondary-line,var(--ui-base-secondary-line))]',
	'[--color-ui-secondary-text:var(--ext-tpl-modal-secondary-text,var(--ui-base-secondary-text))]',
	'[padding:var(--ext-tpl-modal-pad,var(--ext-ui-surface-padding,1.5rem))]',
	'[max-width:var(--ext-tpl-modal-width,448px)]',
].join(' ');

const ACTIONS = 'flex items-center [gap:var(--ext-tpl-modal-actions-gap,12px)]';

export const Page = ({ parts, has }) => (
	<div className={OVERLAY}>
		<div className={CENTERING}>
			<div
				className={classNames(
					BOX,
					has.left ? LEFT : CENTER,
					has.card && CARD_BOX,
				)}
			>
				{has.heading && parts.heading}
				{parts.body}
				{has.actions && (
					<div
						className={classNames(
							ACTIONS,
							has.left ? 'justify-end' : 'justify-center',
						)}
					>
						{parts.actions}
					</div>
				)}
			</div>
		</div>
	</div>
);
