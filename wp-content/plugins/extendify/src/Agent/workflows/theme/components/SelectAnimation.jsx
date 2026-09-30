import { getOption } from '@agent/lib/wp';
import {
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __, _x } from '@wordpress/i18n';
import {
	flipVertical,
	Icon,
	notAllowed,
	shadow,
	square,
} from '@wordpress/icons';
import classNames from 'classnames';

const animations = [
	{
		// translators: Animation style where the element gradually appears by transitioning from transparent to visible. Translate as a simple, non-technical description of the visual effect (e.g., 'appear', 'show up') suitable for non-technical users.
		name: _x('Fade In', 'animation type', 'extendify-local'),
		slug: 'fade',
		icon: shadow,
	},
	{
		// translators: Animation style where the element appears while moving upward. Translate as a simple, non-technical description of the motion (e.g., 'appear from below', 'rise into view') suitable for non-technical users.
		name: _x('Fade Up', 'animation type', 'extendify-local'),
		slug: 'fade-up',
		icon: flipVertical,
	},
	{
		// translators: Animation style where the element appears by scaling from small to its full size. Translate as a simple, non-technical description of the effect (e.g., 'zoom in', 'get closer') suitable for non-technical users. If the target language commonly uses the English term 'zoom', it's acceptable to keep it.
		name: _x('Zoom In', 'animation type', 'extendify-local'),
		slug: 'zoom-in',
		icon: square,
	},
	{
		// translators: None refers to 'no animation'. Apply the correct grammatical gender/form that agrees with the word for 'animation' in the target language.
		name: _x('None', 'animation type', 'extendify-local'),
		slug: 'none',
		icon: notAllowed,
	},
];

const speeds = [
	{
		// translators: "Slow" refers to a slower speed at which the animation effect occurs. This is an option in a list of animation speeds.
		name: _x('Slow', 'animation speed', 'extendify-local'),
		slug: 'slow',
	},
	{
		// translators: "Medium" refers to a moderate speed at which the animation effect occurs. This is an option in a list of animation speeds.
		name: _x('Medium', 'animation speed', 'extendify-local'),
		slug: 'medium',
	},
	{
		// translators: "Fast" refers to a quicker speed at which the animation effect occurs. This is an option in a list of animation speeds.
		name: _x('Fast', 'animation speed', 'extendify-local'),
		slug: 'fast',
	},
];

export const SelectAnimation = ({ onConfirm, onCancel }) => {
	const initialSettings = useRef({});
	const [animation, setAnimation] = useState(null);
	const [touched, setTouched] = useState(0);
	const [speed, setSpeed] = useState(null);
	const [loading, setLoading] = useState(true);
	const undoAnimation = useCallback(() => {
		if (!touched) return;
		window.ExtendableAnimations?.setType(initialSettings.current.type);
		window.ExtendableAnimations?.setSpeed(initialSettings.current.speed);
	}, [touched]);

	const confirmed = useRef(false);
	// Ref keeps the latest undo function, so clean-up always sees the current `touched` state.
	const undoRef = useRef(undoAnimation);
	undoRef.current = undoAnimation;
	useEffect(() => {
		return () => {
			if (!confirmed.current) undoRef.current();
		};
	}, []);

	const handleConfirm = () => {
		if (!animation || !speed || loading) return;
		confirmed.current = true;
		onConfirm({ data: { type: animation, speed } });
	};

	useEffect(() => {
		if (!touched) return;
		window.ExtendableAnimations.setType(animation);
		window.ExtendableAnimations.setSpeed(speed);
	}, [speed, animation, touched]);

	useEffect(() => {
		if (!loading) return;
		getOption('extendify_animation_settings').then((settings = {}) => {
			const defaults = { type: 'none', speed: 'medium' };
			initialSettings.current = { ...defaults, ...(settings || {}) };
			setAnimation(initialSettings.current.type);
			setSpeed(initialSettings.current.speed);
			setLoading(false);
		});
	}, []);

	if (loading) {
		return (
			<div className="min-h-24 p-2 text-center text-sm">
				{
					// translators: This is a status message. 'Loading' is a verb — the app is currently loading the animation options. It is not referring to 'loading animation' as a compound noun.
					__('Loading animation options...', 'extendify-local')
				}
			</div>
		);
	}

	return (
		<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
			<div className="rounded-lg p-3 border-b border-gray-300 bg-white">
				<div className="text-xs uppercase mb-3 text-gray-700 font-medium">
					{/* translators: "Type" refers to the category of animation effects available. e.g. The type could be 'Zoom In', 'Fade', etc. */}
					{_x('Type', 'animation type', 'extendify-local')}
				</div>
				<div className="grid gap-2 mb-6 grid-cols-2 auto-rows-fr">
					{animations.map(({ name, slug, icon }) => (
						<Button
							key={slug}
							name={name}
							icon={icon}
							selected={animation === slug}
							onClick={() => {
								setTouched((v) => v + 1);
								setAnimation(slug);
							}}
						/>
					))}
				</div>
				{/* mb-1 because the toggle group has margins even if undefined */}
				<div className="text-xs uppercase mb-1 text-gray-700 font-medium">
					{/* translators: "Speed" refers to the speed at which the animation effect occurs. This is a heading label shown above the toggle group for selecting animation speed. */}
					{_x('Speed', 'animation speed', 'extendify-local')}
				</div>
				<ToggleGroupControl
					className="border-gray-300 rounded-sm m-0 before:rounded-sm focus-within:border-gray-900"
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					isBlock
					value={speed}
					onChange={(speed) => {
						setTouched((v) => v + 1);
						setSpeed(speed);
					}}
				>
					{speeds.map(({ name, slug }) => (
						<ToggleGroupControlOption key={slug} label={name} value={slug} />
					))}
				</ToggleGroupControl>
			</div>
			<div className="flex justify-start gap-2 p-3">
				<button
					type="button"
					className="w-full rounded-sm border border-gray-500 bg-white p-2 text-sm text-gray-900"
					onClick={onCancel}
				>
					{__('Cancel', 'extendify-local')}
				</button>
				<button
					type="button"
					className="w-full rounded-sm border border-design-main bg-design-main p-2 text-sm text-white"
					disabled={!animation || !speed || loading}
					onClick={handleConfirm}
				>
					{__('Save', 'extendify-local')}
				</button>
			</div>
		</div>
	);
};

const Button = ({ name, selected, icon, onClick }) => {
	return (
		<button
			type="button"
			className={classNames(
				'relative h-full w-full rounded-lg border p-2 text-sm text-left flex flex-col gap-4 font-medium hover:bg-gray-100',
				{
					'border-gray-900 bg-gray-100': selected,
					'border-gray-300 bg-gray-50': !selected,
				},
			)}
			onClick={onClick}
		>
			<Icon icon={icon} className="h-6 w-6" />
			{name}
			{selected && (
				<div className="absolute top-1 right-1 h-3.5 w-3.5 flex items-center justify-center rounded-full bg-design-main text-center text-xss text-white leading-none">
					<span>✓</span>
				</div>
			)}
		</button>
	);
};
