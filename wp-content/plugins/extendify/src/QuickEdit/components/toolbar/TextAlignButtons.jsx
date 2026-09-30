import { Button, Popover } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { alignCenter, alignLeft, alignRight } from '@wordpress/icons';

// Allowlist of block types whose render path applies `has-text-align-*`
// from `attributes.style.typography.textAlign` via useBlockProps.
const SUPPORTED = new Set(['core/heading', 'core/paragraph']);

const OPTIONS = [
	{
		value: 'left',
		icon: alignLeft,
		label: __('Align text left', 'extendify-local'),
	},
	{
		value: 'center',
		icon: alignCenter,
		label: __('Align text center', 'extendify-local'),
	},
	{
		value: 'right',
		icon: alignRight,
		label: __('Align text right', 'extendify-local'),
	},
];

const iconFor = (textAlign) =>
	OPTIONS.find((o) => o.value === textAlign)?.icon ?? alignLeft;

// Gutenberg ships text-alignment as a BlockControls group, but the QE bar
// hides the collapsed-toolbar overflow that group rides in. Restore it as
// a single-button dropdown matching Gutenberg's own AlignmentControl
// shape (one trigger → popover with three options).
//
// Modern heading + paragraph render alignment from
// `style.typography.textAlign` via useBlockProps. Writing there directly
// avoids each block's deprecated flat `textAlign` / `align` attribute and
// matches the shape Gutenberg's AlignmentControl produces.
export const TextAlignButtons = () => {
	const [open, setOpen] = useState(false);
	const wrapRef = useRef(null);

	const selected = useSelect((select) => {
		const editor = select('core/block-editor');
		const clientId = editor.getSelectedBlockClientId();
		if (!clientId) return null;
		const block = editor.getBlock(clientId);
		if (!block || !SUPPORTED.has(block.name)) return null;
		return {
			clientId,
			style: block.attributes?.style ?? null,
			textAlign: block.attributes?.style?.typography?.textAlign ?? null,
		};
	}, []);

	const dispatch = useDispatch('core/block-editor');

	if (!selected) return null;

	const setAlign = (value) => {
		const next = selected.textAlign === value ? undefined : value;
		const typography = { ...(selected.style?.typography || {}) };
		if (next) {
			typography.textAlign = next;
		} else {
			delete typography.textAlign;
		}
		const style = { ...(selected.style || {}) };
		if (Object.keys(typography).length) {
			style.typography = typography;
		} else {
			delete style.typography;
		}
		dispatch?.updateBlockAttributes?.(selected.clientId, {
			style: Object.keys(style).length ? style : undefined,
		});
		setOpen(false);
	};

	return (
		<div className="relative inline-flex items-center" ref={wrapRef}>
			<Button
				className="extendify-quick-edit-text-align-button"
				label={__('Align text', 'extendify-local')}
				aria-expanded={open}
				icon={iconFor(selected.textAlign)}
				onMouseDown={(ev) => ev.preventDefault()}
				onClick={() => setOpen((v) => !v)}
			/>
			{open ? (
				<Popover
					placement="bottom-start"
					onClose={() => setOpen(false)}
					focusOnMount="firstElement"
					className="extendify-quick-edit extendify-quick-edit-text-align-popover"
					anchor={wrapRef.current}
				>
					<div
						className="extendify-quick-edit-text-align-popover-inner"
						role="listbox"
						aria-label={__('Text alignment', 'extendify-local')}
					>
						{OPTIONS.map(({ value, icon, label }) => (
							<Button
								key={value}
								role="option"
								aria-selected={selected.textAlign === value}
								className="extendify-quick-edit-text-align-option"
								variant={selected.textAlign === value ? 'primary' : 'tertiary'}
								icon={icon}
								onClick={() => setAlign(value)}
								onMouseDown={(ev) => ev.preventDefault()}
							>
								{label}
							</Button>
						))}
					</div>
				</Popover>
			) : null}
		</div>
	);
};
