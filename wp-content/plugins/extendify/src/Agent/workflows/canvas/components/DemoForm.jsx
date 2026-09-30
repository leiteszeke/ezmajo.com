import { CANVAS_CONFETTI, THROW } from '@agent/lib/confetti';
import { useCanvasStore } from '@agent/state/canvas';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { check, chevronDown, Icon } from '@wordpress/icons';
import { useReducedMotion } from 'framer-motion';

// The step settles before the scroll moves the stack, or the two read as one blur.
const DISABLE = 0.3;
const CLOSE_DELAY = 3000;
const SCROLL_TIME = 400;
const STEP_INSET = 48;

const scrollBox = (el) => {
	for (let node = el?.parentElement; node; node = node.parentElement) {
		const scrollable = /(auto|scroll)/.test(getComputedStyle(node).overflowY);
		if (scrollable && node.scrollHeight > node.clientHeight) return node;
	}
	return null;
};

// Native smooth scroll times by distance, so long and short advances differ in speed.
const scrollToTop = (card, instant) => {
	const box = scrollBox(card);
	if (!box) return () => {};
	const from = box.scrollTop;
	const to =
		from +
		card.getBoundingClientRect().top -
		box.getBoundingClientRect().top -
		STEP_INSET;
	if (instant) {
		box.scrollTop = to;
		return () => {};
	}
	const start = performance.now();
	let frame = requestAnimationFrame(function step(now) {
		const progress = Math.min((now - start) / SCROLL_TIME, 1);
		box.scrollTop = from + (to - from) * (1 - (1 - progress) ** 3);
		if (progress < 1) frame = requestAnimationFrame(step);
	});
	return () => cancelAnimationFrame(frame);
};

export const steps = [
	{
		id: 'business',
		title: __('Business details', 'extendify-local'),
		inputSchema: {
			type: 'object',
			properties: {
				businessName: {
					type: 'string',
					description: __('Business name', 'extendify-local'),
				},
				tagline: {
					type: 'string',
					// translators: Form field label. A tagline is the short line describing what a business does.
					description: __('Tagline', 'extendify-local'),
				},
				contactEmail: {
					type: 'string',
					format: 'email',
					description: __('Contact email', 'extendify-local'),
				},
				phone: {
					type: 'string',
					description: __('Phone number', 'extendify-local'),
				},
			},
		},
	},
	{
		id: 'content',
		title: __('Content and audience', 'extendify-local'),
		inputSchema: {
			type: 'object',
			properties: {
				postCount: {
					type: 'string',
					description: __('Published posts', 'extendify-local'),
				},
				topics: {
					type: 'string',
					// translators: Form field label. The subjects this website writes about.
					description: __('Main topics', 'extendify-local'),
					'x-widget': 'textarea',
				},
				latestPost: {
					type: 'string',
					description: __('Most recent post', 'extendify-local'),
				},
				cadence: {
					type: 'string',
					// translators: Form field label. How often the website publishes something new.
					description: __('Publishing cadence', 'extendify-local'),
					enum: [
						__('Weekly', 'extendify-local'),
						__('Monthly', 'extendify-local'),
						__('A few times a year', 'extendify-local'),
						__('Not publishing right now', 'extendify-local'),
					],
				},
			},
		},
	},
	{
		id: 'technical',
		title: __('Technical', 'extendify-local'),
		inputSchema: {
			type: 'object',
			properties: {
				plugins: {
					type: 'string',
					description: __('Plugins in use', 'extendify-local'),
					'x-widget': 'textarea',
				},
				theme: {
					type: 'string',
					description: __('Active theme', 'extendify-local'),
				},
				sellsOnline: {
					type: 'string',
					// translators: Form field label. Whether this website sells anything online.
					description: __('Sells online', 'extendify-local'),
					enum: [__('Yes', 'extendify-local'), __('No', 'extendify-local')],
				},
				contactForm: {
					type: 'string',
					description: __('Contact form plugin', 'extendify-local'),
				},
			},
		},
	},
];

// The disabled colors land the moment the attribute flips, so without this the
// fill jumps a frame before the step's fade even starts.
const inputClass =
	'w-full rounded-sm border border-gray-300 bg-white p-2 text-sm text-gray-900 transition-colors duration-300 disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-700';

// JSON Schema has no way to say a string wants a textarea.
const Field = ({ name, property, value, onChange }) => {
	const id = `extendify-demo-form-${name}`;
	const props = {
		id,
		className: inputClass,
		value,
		onChange: (event) => onChange(event.target.value),
	};

	return (
		<div className="flex flex-col gap-1 text-sm text-gray-900">
			<label htmlFor={id}>{property.description}</label>
			{property['x-widget'] === 'textarea' ? (
				<textarea {...props} rows={3} />
			) : property.enum ? (
				<div className="relative">
					{/* wp-admin gives selects their own caret and a 25rem width cap. */}
					<select
						{...props}
						className={`${inputClass} max-w-none appearance-none bg-none pe-8`}
					>
						<option value="" />
						{property.enum.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
					<Icon
						className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 fill-current text-gray-700"
						icon={chevronDown}
						size={20}
					/>
				</div>
			) : (
				<input
					{...props}
					type={property.format === 'email' ? 'email' : 'text'}
				/>
			)}
		</div>
	);
};

const StepBadge = ({ index, active, done }) => {
	const tone = done
		? 'bg-design-main text-white'
		: active
			? 'bg-gray-900 text-white'
			: 'bg-gray-200 text-gray-700';

	return (
		<span
			className={`flex h-5 w-5 items-center justify-center rounded-full text-xss ${tone}`}
		>
			{done ? (
				<Icon className="fill-current" icon={check} size={14} />
			) : (
				index + 1
			)}
		</span>
	);
};

const StepCard = ({ step, index, activeStep, isLast, onFinish }) => {
	const { values, setValue, goToStep, reached } = useCanvasStore();
	const reduceMotion = useReducedMotion();
	const card = useRef(null);
	const active = index === activeStep;
	const done = index < activeStep;
	const opened = index <= reached;

	useEffect(() => {
		if (!active) return;
		let cancelScroll = () => {};
		const timer = setTimeout(() => {
			cancelScroll = scrollToTop(card.current, reduceMotion);
		}, DISABLE * 1000);
		return () => {
			clearTimeout(timer);
			cancelScroll();
		};
	}, [active, reduceMotion]);

	return (
		<div
			ref={card}
			className={`overflow-hidden rounded-lg border border-solid bg-gray-50 transition-shadow duration-300 ${active ? 'border-gray-300 shadow-md' : 'border-gray-200 shadow-none'}`}
		>
			{/* Fading the card instead shows the dotted ground through the input fields. */}
			<form
				className={`transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-40'}`}
				onSubmit={(event) => {
					event.preventDefault();
					if (isLast) return onFinish();
					goToStep(index + 1);
				}}
			>
				<fieldset
					disabled={!active}
					className="m-0 flex min-w-0 flex-col border-0 p-0"
				>
					<div className="rounded-lg border-0 border-b border-solid border-gray-300 bg-white">
						<div className="flex items-center gap-2 border-0 border-b border-solid border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">
							<StepBadge index={index} active={active} done={done} />
							{step.title}
						</div>
						{opened ? (
							<div className="flex min-w-0 flex-col gap-4 p-4">
								{Object.entries(step.inputSchema.properties).map(
									([name, property]) => (
										<Field
											key={name}
											name={name}
											property={property}
											value={values[name] ?? ''}
											onChange={(value) => setValue(name, value)}
										/>
									),
								)}
							</div>
						) : null}
					</div>
					{opened ? (
						<div className="flex justify-end gap-2 p-3">
							{index > 0 ? (
								<button
									type="button"
									className="rounded-sm border border-gray-500 bg-white px-4 py-2 text-sm text-gray-900"
									onClick={() => goToStep(index - 1)}
								>
									{__('Back', 'extendify-local')}
								</button>
							) : null}
							<button
								type="submit"
								className="rounded-sm border border-design-main bg-design-main px-4 py-2 text-sm text-white"
							>
								{isLast
									? __('Submit', 'extendify-local')
									: __('Next', 'extendify-local')}
							</button>
						</div>
					) : null}
				</fieldset>
			</form>
		</div>
	);
};

const Submitted = () => (
	<div className="flex flex-col items-center gap-2 rounded-lg border border-solid border-gray-300 bg-white p-8 text-sm text-gray-900">
		<span aria-hidden className="text-2xl leading-none">
			🎉
		</span>
		<span className="font-medium">
			{__('Form submitted', 'extendify-local')}
		</span>
		<span className="text-gray-700">
			{__('This was a demo. Nothing saved.', 'extendify-local')}
		</span>
		<span className="text-gray-700">
			{__('Closing this in a moment…', 'extendify-local')}
		</span>
	</div>
);

export const DemoForm = ({ onConfirm }) => {
	// Local state would leave the agent unable to read or write these.
	const { activeStep, startSession } = useCanvasStore();
	const [submitted, setSubmitted] = useState(false);

	// A layout swap remounts the form, and re-seeding wipes what was typed.
	useEffect(() => {
		if (!useCanvasStore.getState().steps.length) startSession(steps);
	}, [startSession]);

	useEffect(() => {
		if (!submitted) return;
		window.dispatchEvent(new CustomEvent(CANVAS_CONFETTI, { detail: THROW }));
		const timer = setTimeout(
			() => onConfirm({ data: useCanvasStore.getState().values }),
			CLOSE_DELAY,
		);
		return () => clearTimeout(timer);
	}, [submitted, onConfirm]);

	if (submitted) {
		return (
			<div className="flex min-h-full items-center justify-center">
				<Submitted />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 pb-[200px]">
			{steps.map((step, index) => (
				<StepCard
					key={step.id}
					step={step}
					index={index}
					activeStep={activeStep}
					isLast={index === steps.length - 1}
					onFinish={() => setSubmitted(true)}
				/>
			))}
		</div>
	);
};
