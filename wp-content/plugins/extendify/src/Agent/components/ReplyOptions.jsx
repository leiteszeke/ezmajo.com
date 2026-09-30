import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { arrowUp, chevronDown, chevronUp, Icon } from '@wordpress/icons';
import classNames from 'classnames';

export const ReplyOptions = ({ options, onSubmit }) => {
	const [own, setOwn] = useState('');
	const [picked, setPicked] = useState(null);
	const optionRefs = useRef([]);
	const ownRef = useRef(null);
	const cardRef = useRef(null);
	const typed = own.trim().length > 0;

	// Without this the footer opens below the chat's visible edge.
	const keepInView = useCallback(() => {
		const el = cardRef.current;
		const scroller = el?.closest(
			'#extendify-agent-chat-scroll-area',
		)?.parentElement;
		if (!scroller) return;
		const overflow =
			el.getBoundingClientRect().bottom -
			scroller.getBoundingClientRect().bottom;
		if (overflow > 0) scroller.scrollTop += overflow + 8;
	}, []);

	// The box takes focus so typing needs no click and no option looks chosen.
	useEffect(() => {
		const target = ownRef.current;
		target?.focus();
		if (document.activeElement === target) {
			keepInView();
			return;
		}
		// Hidden elements refuse focus, and reloads hide the chat until first paint.
		const timer = setInterval(() => {
			const active = document.activeElement;
			if (active && active !== document.body && active !== target) {
				clearInterval(timer);
				return;
			}
			target?.focus();
			if (document.activeElement !== target) return;
			clearInterval(timer);
			keepInView();
		}, 100);
		const stop = setTimeout(() => clearInterval(timer), 3000);
		return () => {
			clearInterval(timer);
			clearTimeout(stop);
		};
	}, [keepInView]);

	const adjustHeight = useCallback(() => {
		const el = ownRef.current;
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = `${el.scrollHeight}px`;
		keepInView();
	}, [keepInView]);

	const submit = (value) => {
		const trimmed = value?.trim();
		if (!trimmed) return;
		onSubmit(trimmed);
	};

	// Sending would discard an answer they already typed, so it only stages.
	const handleOption = (option, index) => {
		if (!typed) return submit(option);
		setPicked((prev) => (prev === index ? null : index));
	};

	// Arrows never leave the textarea — inside it they move the caret.
	const focusStop = (index) => {
		const stops = [...optionRefs.current, ownRef.current].filter(Boolean);
		stops[Math.max(0, Math.min(index, stops.length - 1))]?.focus();
	};

	const handleArrows = (event, index) => {
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
		event.preventDefault();
		focusStop(index + (event.key === 'ArrowDown' ? 1 : -1));
	};

	return (
		<div className="flex flex-col gap-1.5">
			{options.length ? (
				<div className="text-xs text-gray-700">
					{typed
						? __('Press to select', 'extendify-local')
						: __('Press to submit', 'extendify-local')}
				</div>
			) : null}
			<div
				ref={cardRef}
				className="flex flex-col rounded-lg border border-gray-300 bg-gray-50"
			>
				<div className="rounded-lg border-b border-gray-300 bg-white">
					{options.length ? (
						options.map((option, index) => (
							<OptionRow
								key={option}
								option={option}
								// The typed answer is the live one until a suggestion is picked.
								muted={typed && picked !== index}
								selected={picked === index}
								divided={index > 0}
								first={index === 0}
								last={index === options.length - 1}
								onSelect={() => handleOption(option, index)}
								onArrow={(event) => handleArrows(event, index)}
								optionRef={(el) => {
									optionRefs.current[index] = el;
								}}
							/>
						))
					) : (
						<div className="p-3 text-sm text-gray-700">
							{__(
								'The agent is asking for additional information.',
								'extendify-local',
							)}
						</div>
					)}
				</div>
				{/* biome-ignore lint: the whole footer is the answer box's click target */}
				<div
					className="flex cursor-text items-end gap-2 p-3"
					onClick={() => ownRef.current?.focus()}
				>
					<textarea
						ref={ownRef}
						value={own}
						rows={1}
						onChange={(e) => {
							setOwn(e.target.value);
							setPicked(null);
							adjustHeight();
						}}
						// Safari leaves focus here when a button is clicked, so onFocus
						// alone never fires on the way back.
						onFocus={() => setPicked(null)}
						onPointerDown={() => setPicked(null)}
						onKeyDown={(event) => {
							if (event.key !== 'Enter' || event.shiftKey) return;
							event.preventDefault();
							submit(own);
						}}
						className={classNames(
							'max-h-40 min-h-6 w-full resize-none overflow-y-auto border-none bg-transparent p-0 text-base text-gray-900 transition-opacity placeholder:text-gray-700 focus:shadow-none focus:outline-hidden md:text-sm',
							{ 'opacity-40': picked !== null },
						)}
						placeholder={__('Type your own answer…', 'extendify-local')}
					/>
					{typed ? (
						<button
							type="button"
							onClick={() => submit(picked === null ? own : options[picked])}
							className={classNames(
								// Same height as one text line, so the row doesn't grow when it appears.
								'inline-flex h-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-design-main text-white transition-colors hover:opacity-90 focus-visible:ring-design-main',
								picked === null ? 'w-6 p-0' : 'px-2.5 text-sm',
							)}
						>
							{picked === null ? (
								<Icon fill="currentColor" icon={arrowUp} size={16} />
							) : (
								__('Submit', 'extendify-local')
							)}
							<span className="sr-only">
								{__('Send answer', 'extendify-local')}
							</span>
						</button>
					) : null}
				</div>
				{typed ? (
					<div className="px-3 pb-2 text-xss text-gray-700">
						{__('Shift + Enter for a new line', 'extendify-local')}
					</div>
				) : null}
			</div>
		</div>
	);
};

const OptionRow = ({
	option,
	muted,
	selected,
	divided,
	first,
	last,
	onSelect,
	onArrow,
	optionRef,
}) => {
	const textRef = useRef(null);
	const [clipped, setClipped] = useState(false);
	const [open, setOpen] = useState(false);

	// A clamped box reports scrollHeight as the clamped height; lift to measure.
	useLayoutEffect(() => {
		const el = textRef.current;
		if (!el) return;
		const clamped = el.clientHeight;
		el.style.webkitLineClamp = 'unset';
		const full = el.scrollHeight;
		el.style.webkitLineClamp = '';
		setClipped(full - clamped > 1);
	}, []);

	return (
		<div
			className={classNames('relative transition-opacity hover:opacity-100', {
				'opacity-40': muted,
				'border-0 border-t border-solid border-gray-300': divided,
				'ring-2 ring-inset ring-design-main': selected,
				// Focus rings follow border-radius; a square row overdraws the card's corner.
				'rounded-t-lg': first,
				'rounded-b-lg': last,
			})}
		>
			<button
				type="button"
				ref={optionRef}
				onClick={onSelect}
				onKeyDown={onArrow}
				className={classNames(
					'w-full cursor-pointer border-0 bg-transparent p-3 text-left text-sm text-gray-900 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-design-main',
					// Reserve room under the overlaid toggle so text can't run beneath it.
					{ 'pe-10': clipped, 'rounded-t-lg': first, 'rounded-b-lg': last },
				)}
			>
				{/* `block` would beat line-clamp's display:-webkit-box and unclamp it. */}
				<span
					ref={textRef}
					className={classNames('leading-5', open ? 'block' : 'line-clamp-2')}
				>
					{option}
				</span>
			</button>
			{clipped ? (
				<button
					type="button"
					onClick={() => setOpen((prev) => !prev)}
					className="absolute end-2 top-2.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm border-0 bg-gray-100 p-0 text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-design-main"
				>
					<Icon
						fill="currentColor"
						icon={open ? chevronUp : chevronDown}
						size={18}
					/>
					<span className="sr-only">
						{open
							? __('Show less', 'extendify-local')
							: __('Show more', 'extendify-local')}
					</span>
				</button>
			) : null}
		</div>
	);
};
