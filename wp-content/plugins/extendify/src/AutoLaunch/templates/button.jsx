import { Spinner } from '@wordpress/components';
import { chevronRight, Icon } from '@wordpress/icons';

const BASE = [
	'inline-flex items-center rounded-ui-button font-normal transition-opacity',
	'[padding:var(--ext-ui-button-pad,8px)_var(--ext-ui-button-pad-x,12px)]',
	'[font-size:var(--ext-ui-button-size,14px)]',
	'[line-height:var(--ext-ui-button-leading,20px)]',
	'disabled:opacity-40',
].join(' ');

const LABEL = '[padding-inline:var(--ext-ui-button-label-pad,4px)]';

export const ACTION = [
	BASE,
	'justify-center border-0 bg-ui-action text-ui-action-text hover:opacity-90',
	// A partner whose page and button colors match would otherwise see no button.
	'inset-ring-1 inset-ring-ui-action-text/25',
	'focus:outline-none focus-visible:ring-1 focus-visible:ring-ui-action focus-visible:ring-offset-2',
].join(' ');

export const SECONDARY = [
	BASE,
	'bg-ui-secondary-fill ring-1 ring-ui-secondary-line',
	'text-ui-secondary-text hover:opacity-80',
].join(' ');

export const ActionButton = ({
	label,
	icon = chevronRight,
	type = 'button',
	disabled,
	processing,
	onClick,
}) => (
	<button
		type={type}
		onClick={onClick}
		disabled={disabled || processing}
		className={ACTION}
	>
		<span className={LABEL}>{label}</span>
		{/* Fixed box: a spinner narrower than the arrow would shrink the button mid-click. */}
		<span className="flex h-6 w-6 items-center justify-center">
			{processing ? (
				<Spinner className="m-0" />
			) : (
				<Icon fill="currentColor" icon={icon} size={24} />
			)}
		</span>
	</button>
);

export const SecondaryButton = ({ label, icon, disabled, onClick }) => (
	<button
		type="button"
		onClick={onClick}
		disabled={disabled}
		className={SECONDARY}
	>
		{icon && <Icon fill="currentColor" icon={icon} size={24} />}
		<span className={LABEL}>{label}</span>
	</button>
);
