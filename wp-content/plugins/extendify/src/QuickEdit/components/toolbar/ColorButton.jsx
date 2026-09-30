import { Button, ColorPalette, Popover } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	applyColorFormat,
	captureDomRichTextSelection,
} from '../../lib/rich-text-color';

export function ColorButton({ kind, label, iconClassName }) {
	const [open, setOpen] = useState(false);
	const wrapRef = useRef(null);
	const frozenSel = useRef(null);

	const sel = useSelect((select) => {
		const editor = select('core/block-editor');
		const start = editor.getSelectionStart();
		const end = editor.getSelectionEnd();
		if (!start || !start.clientId) return null;
		const block = editor.getBlock(start.clientId);
		if (!block) return null;
		const settings = editor.getSettings() || {};
		return { start, end, block, palette: settings.colors || [] };
	}, []);

	// React-context registry dispatch; the outer wp.data.dispatch can't see this block.
	const dispatch = useDispatch('core/block-editor');

	return (
		<div className="relative inline-flex items-center" ref={wrapRef}>
			<Button
				className="extendify-quick-edit-color-button"
				label={label}
				aria-expanded={open}
				onMouseDown={(ev) => {
					// Capture selection before focus moves to the popover and discards it.
					ev.preventDefault();
					frozenSel.current = {
						sel,
						dom: captureDomRichTextSelection(),
					};
				}}
				onClick={() => setOpen((v) => !v)}
				icon={
					<span
						className={`relative inline-flex h-[20px] w-[20px] items-center justify-center text-[15px] font-semibold leading-none text-gray-900 font-qe ${iconClassName}`}
						aria-hidden="true"
					/>
				}
			/>
			{open ? (
				<Popover
					placement="bottom-start"
					onClose={() => setOpen(false)}
					focusOnMount="firstElement"
					className="extendify-quick-edit extendify-quick-edit-color-popover"
					anchor={wrapRef.current}
				>
					<div className="extendify-quick-edit-color-popover-inner">
						<ColorPalette
							colors={sel?.palette || []}
							onChange={(c) => {
								applyColorFormat(frozenSel.current, kind, c, dispatch);
								setOpen(false);
							}}
							clearable
							disableCustomColors={false}
							enableAlpha={false}
						/>
						<Button
							variant="tertiary"
							className="extendify-quick-edit-color-clear"
							onClick={() => {
								applyColorFormat(frozenSel.current, kind, null, dispatch);
								setOpen(false);
							}}
						>
							{kind === 'text'
								? __('Clear text color', 'extendify-local')
								: __('Clear highlight', 'extendify-local')}
						</Button>
					</div>
				</Popover>
			) : null}
		</div>
	);
}
