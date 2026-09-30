import classNames from 'classnames';

export const ModalHeading = ({ title }) => (
	<h2 className="m-0 p-0 text-ui-heading font-ui-heading font-ui-strong tracking-ui-heading text-ui-ink">
		{title}
	</h2>
);

export const ModalText = ({ children, strong }) => (
	<p
		className={classNames(
			'm-0 text-ui-body leading-ui text-ui-ink',
			strong && 'font-medium',
		)}
	>
		{children}
	</p>
);

export const ModalLink = ({ label, href }) => (
	<a
		className="text-ui-body font-medium leading-ui underline [color:var(--ext-tpl-modal-link,var(--color-ui-action))]"
		href={href}
	>
		{label}
	</a>
);
