import { Button, Popover } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

const LEVELS = [1, 2, 3, 4, 5, 6];

// Gutenberg ships the heading-level picker inside `.block-editor-block-switcher`,
// which our floating bar hides (transform options aren't in scope for QE).
// Restore just the level picker as a standalone button, matching the
// ColorButton shape so the bar feels uniform.
export function HeadingLevelButton() {
	const [open, setOpen] = useState(false);
	const wrapRef = useRef(null);

	const selected = useSelect((select) => {
		const editor = select('core/block-editor');
		const clientId = editor.getSelectedBlockClientId();
		if (!clientId) return null;
		const block = editor.getBlock(clientId);
		if (!block || block.name !== 'core/heading') return null;
		return { clientId, level: Number(block.attributes?.level) || 2 };
	}, []);

	const dispatch = useDispatch('core/block-editor');

	if (!selected) return null;

	const setLevel = (level) => {
		dispatch?.updateBlockAttributes?.(selected.clientId, { level });
		setOpen(false);
	};

	return (
		<div className="relative inline-flex items-center" ref={wrapRef}>
			<Button
				className="extendify-quick-edit-heading-level-button"
				label={__('Heading level', 'extendify-local')}
				aria-expanded={open}
				onMouseDown={(ev) => ev.preventDefault()}
				onClick={() => setOpen((v) => !v)}
			>
				<span aria-hidden="true">{`H${selected.level}`}</span>
			</Button>
			{open ? (
				<Popover
					placement="bottom-start"
					onClose={() => setOpen(false)}
					focusOnMount="firstElement"
					className="extendify-quick-edit extendify-quick-edit-heading-level-popover"
					anchor={wrapRef.current}
				>
					<div
						className="extendify-quick-edit-heading-level-popover-inner"
						role="listbox"
						aria-label={__('Heading level', 'extendify-local')}
					>
						{LEVELS.map((n) => (
							<Button
								key={n}
								role="option"
								aria-selected={selected.level === n}
								className="extendify-quick-edit-heading-level-option"
								variant={selected.level === n ? 'primary' : 'tertiary'}
								onClick={() => setLevel(n)}
								onMouseDown={(ev) => ev.preventDefault()}
								label={sprintf(
									// translators: %d is the heading level number 1-6.
									__('Heading %d', 'extendify-local'),
									n,
								)}
							>
								{`H${n}`}
							</Button>
						))}
					</div>
				</Popover>
			) : null}
		</div>
	);
}
