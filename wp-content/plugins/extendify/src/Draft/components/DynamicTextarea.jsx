import {
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { AnimatePresence, motion } from 'framer-motion';

export const DynamicTextarea = ({
	value,
	className,
	onChange,
	onKeyDown,
	disabled,
	placeholder,
}) => {
	const ref = useRef(null);
	const [height, setHeight] = useState('auto');

	// Dynamically resize the input by creating a temporary version and measuring the height.
	// This is a workaround for scrollHeight not reducing when text is deleted.
	useLayoutEffect(() => {
		const tempTextarea = document.createElement('textarea');
		tempTextarea.value = value || placeholder;
		tempTextarea.rows = 1; // Start at 1

		const styleProps = [
			'paddingTop',
			'paddingBottom',
			'paddingLeft',
			'paddingRight',
			'width',
			'fontFamily',
			'fontSize',
			'borderWidth',
		];

		const styles = window.getComputedStyle(ref.current);

		// apply styles to the temporary textarea
		styleProps.forEach((prop) => {
			tempTextarea.style[prop] = styles[prop];
		});

		Object.assign(tempTextarea.style, {
			position: 'absolute',
			left: '-9999px',
		});

		document.body.appendChild(tempTextarea);
		setHeight(`${tempTextarea.scrollHeight}px`);
		document.body.removeChild(tempTextarea);
	}, [value, placeholder]);

	// Focus the input.
	useEffect(() => {
		const input = ref.current;
		if (!input) return;
		if (document.activeElement === input) return;

		const inputLength = input.value.length;
		input.focus();
		input.setSelectionRange(inputLength, inputLength); // Place cursor at the end of the input.
	}, [value]);

	return (
		<AnimatePresence>
			<motion.div
				className="m-0.5 w-full"
				key="input"
				animate={{ height }}
				transition={{ duration: 0.2 }}
				style={{ lineHeight: 0 }}
			>
				<label htmlFor="draft-ai-textarea" className="sr-only">
					{placeholder}
				</label>
				<textarea
					ref={ref}
					id="draft-ai-textarea"
					disabled={disabled}
					className={className}
					value={value}
					rows={1}
					onChange={onChange}
					onKeyDown={onKeyDown}
					onScroll={(event) => {
						event.target.scrollTop = 0;
					}}
					placeholder={placeholder}
				/>
			</motion.div>
		</AnimatePresence>
	);
};
