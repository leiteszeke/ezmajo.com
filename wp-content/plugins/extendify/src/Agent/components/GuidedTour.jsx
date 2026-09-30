import { useGlobalStore } from '@agent/state/global';
import { useTourStore } from '@agent/state/tours';
import tours from '@agent/tours/tours';
import { Dialog } from '@headlessui/react';
import { Button, Spinner } from '@wordpress/components';
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { __, isRTL, sprintf } from '@wordpress/i18n';
import { close, Icon } from '@wordpress/icons';
import classNames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';

const getBoundingClientRect = (element) => {
	const { top, right, bottom, left, width, height, x, y } =
		element.getBoundingClientRect();
	return { top, right, bottom, left, width, height, x, y };
};

export const GuidedTour = () => {
	const tourBoxRef = useRef();
	const {
		currentTour,
		currentStep,
		startTour,
		closeCurrentTour,
		getStepData,
		onTourPage,
	} = useTourStore();
	const { settings } = currentTour || {};
	const { image, title, text, attachTo, events, options } =
		getStepData(currentStep);

	const { queueTourForRedirect, queuedTour, clearQueuedTour, isMobile } =
		useGlobalStore();
	const { element, frame, offset, position, hook, boxPadding } = attachTo || {};

	const elementSelector = useMemo(
		() => (typeof element === 'function' ? element() : element),
		[element],
	);

	const frameSelector = useMemo(
		() => (typeof frame === 'function' ? frame() : frame),
		[frame],
	);

	const offsetNormalized = useMemo(
		() => (typeof offset === 'function' ? offset() : offset),
		[offset],
	);
	const hookNormalized = useMemo(
		() => (typeof hook === 'function' ? hook() : hook),
		[hook],
	);

	const initialFocus = useRef();
	const finishedStepOne = useRef(false);
	const [targetedElement, setTargetedElement] = useState(null);
	const [redirecting, setRedirecting] = useState(false);
	const [visible, setVisible] = useState(false);
	const [overlayRect, setOverlayRect] = useState(null);
	const [placement, setPlacement] = useState({
		x: undefined,
		y: undefined,
		...offsetNormalized,
	});
	const setTourBox = useCallback(
		(x, y) => {
			// x is 20 on mobile, so exclude the offset here
			setPlacement(x === 20 ? { x, y } : { x, y, ...offsetNormalized });
		},
		[offsetNormalized],
	);
	const getOffset = useCallback(() => {
		const hooks = hookNormalized?.split(' ') || [];
		return {
			x: hooks.includes('right') ? tourBoxRef.current?.offsetWidth : 0,
			y: hooks.includes('bottom') ? tourBoxRef.current?.offsetHeight : 0,
		};
	}, [hookNormalized]);

	const startOrRecalc = useCallback(() => {
		if (!targetedElement) return;

		const frame = frameSelector
			? (document.querySelector(frameSelector)?.contentDocument ?? document)
			: document;

		const rect = getBoundingClientRect(
			frame.querySelector(elementSelector) ?? targetedElement,
		);

		// Adjust the frame position if we're in an iframe
		if (frame !== document) {
			const frameRect = getBoundingClientRect(frame.defaultView.frameElement);
			rect.x += frameRect.x;
			rect.left += frameRect.x;
			rect.right += frameRect.x;
			rect.y += frameRect.y;
			rect.top += frameRect.y;
			rect.bottom += frameRect.y;
		}

		if (window.innerWidth <= 960) {
			closeCurrentTour('closed-resize');
			return;
		}
		if (position?.x === undefined) {
			setTourBox(undefined, undefined);
			setOverlayRect(null);
			setVisible(false);
			return;
		}
		const x = Math.max(20, rect?.[position.x] - getOffset().x);
		const y = Math.max(20, rect?.[position.y] - getOffset().y);
		const box = tourBoxRef.current;
		// make sure it doesn't go off-screen
		setTourBox(
			Math.min(x, window.innerWidth - (box?.offsetWidth ?? 0) - 20),
			Math.min(y, window.innerHeight - (box?.offsetHeight ?? 0) - 20),
		);
		setOverlayRect(rect);
	}, [
		targetedElement,
		position,
		getOffset,
		setTourBox,
		frameSelector,
		elementSelector,
		closeCurrentTour,
	]);

	// Pre-launch check whether to redirect
	useLayoutEffect(() => {
		// if the tour has a start from url, redirect there
		if (!settings?.startFrom) return;
		if (onTourPage()) return;
		setRedirecting(true);
		queueTourForRedirect(currentTour.id);
		closeCurrentTour('redirected');
		window.location.assign(settings?.startFrom[0]);
		if (
			window.location.href.split('#')[0] === settings.startFrom[0].split('#')[0]
		) {
			// Reload if hash is the only difference
			window.location.reload();
		}
	}, [
		settings?.startFrom,
		currentTour,
		queueTourForRedirect,
		closeCurrentTour,
		onTourPage,
	]);

	// Check for the inert attribute and remove it if it exists
	useEffect(() => {
		if (!currentStep) return;
		document.querySelectorAll('[inert]').forEach((el) => {
			el?.removeAttribute('inert');
		});
	}, [currentStep]);

	// register a custom event to start the specified tour.
	useEffect(() => {
		const handle = (event) => {
			const { tourSlug } = event.detail;
			if (!tours[tourSlug]) return;

			requestAnimationFrame(() => {
				startTour(tours[tourSlug]);
			});
		};
		window.addEventListener('extendify-assist:start-tour', handle);
		return () => {
			window.removeEventListener('extendify-assist:start-tour', handle);
		};
	}, [startTour]);

	// Possibly start the tour, or wait for the load event
	useLayoutEffect(() => {
		if (redirecting) return;
		const tour = queuedTour;
		let rafId = 0;
		if (!tour || !tours[tour]) return clearQueuedTour();
		const handle = () => {
			requestAnimationFrame(() => {
				startTour(tours[tour]);
			});
			clearQueuedTour();
		};

		addEventListener('load', handle);
		if (document.readyState === 'complete') {
			// Page is already loaded, so we can start the tour immediately
			rafId = requestAnimationFrame(handle);
		}
		return () => {
			cancelAnimationFrame(rafId);
			removeEventListener('load', handle);
		};
	}, [startTour, queuedTour, clearQueuedTour, redirecting]);

	useEffect(() => {
		if (!elementSelector) return;
		// Find and set the element we are attaching to
		const frame = frameSelector
			? (document.querySelector(frameSelector)?.contentDocument ?? document)
			: document;
		const element =
			frame.querySelector(elementSelector) ??
			document.querySelector(elementSelector);
		if (!element) return;

		setTargetedElement(element);
		return () => setTargetedElement(null);
	}, [frameSelector, elementSelector]);

	// Start building the tour step
	useLayoutEffect(() => {
		if (!targetedElement || redirecting) return;
		setVisible(true);
		startOrRecalc();
		addEventListener('resize', startOrRecalc);
		if (!options?.allowPointerEvents) {
			targetedElement.style.pointerEvents = 'none';
		}
		return () => {
			removeEventListener('resize', startOrRecalc);
			targetedElement.style.pointerEvents = 'auto';
		};
	}, [redirecting, targetedElement, startOrRecalc, options]);

	useEffect(() => {
		if (finishedStepOne.current) return;
		if (!currentStep) return;
		finishedStepOne.current = true;
	}, [currentStep]);
	// Handle the attach and detach events
	useEffect(() => {
		if (currentStep === undefined || !targetedElement) return;
		events?.onAttach?.(targetedElement);
		let inner = 0;
		const id = requestAnimationFrame(() => {
			targetedElement.scrollIntoView({ block: 'center' });
			startOrRecalc();
			inner = requestAnimationFrame(startOrRecalc);
		});
		initialFocus?.current?.focus();
		return () => {
			events?.onDetach?.(targetedElement);
			cancelAnimationFrame(id);
			cancelAnimationFrame(inner);
		};
	}, [currentStep, events, targetedElement, startOrRecalc, initialFocus]);

	useLayoutEffect(() => {
		if (!settings?.allowOverflow) return;
		document.documentElement.classList.add('ext-force-overflow-auto');
		return () => {
			document.documentElement.classList.remove('ext-force-overflow-auto');
		};
	}, [settings]);

	if (!visible || isMobile) return null;

	const rectWithPadding = addPaddingToRect(overlayRect, boxPadding);
	return (
		<AnimatePresence>
			{Boolean(currentTour) && (
				<Dialog
					as={motion.div}
					static
					initialFocus={initialFocus}
					className="extendify-agent"
					open={Boolean(currentTour)}
					onClose={() => undefined}
				>
					<div className="relative z-max">
						<motion.div
							ref={tourBoxRef}
							animate={{ opacity: 1, ...placement }}
							initial={{ opacity: 0, ...placement }}
							// TODO: fire another event after animation completes?
							onAnimationComplete={() => {
								startOrRecalc();
							}}
							transition={{
								duration: finishedStepOne.current ? 0.5 : 0,
								ease: 'easeInOut',
							}}
							className="fixed left-0 top-0 z-20 flex max-w-xs flex-col bg-transparent shadow-2xl sm:overflow-hidden"
							style={{
								minWidth: settings?.minBoxWidth ?? '325px',
							}}
						>
							<button
								type="button"
								data-test="close-tour"
								className="absolute right-0 top-0 z-20 m-2 flex h-6 w-6 items-center justify-center rounded-full border-0 bg-white p-0 leading-none outline-hidden ring-1 ring-gray-200 focus:shadow-none focus:ring-wp focus:ring-design-main rtl:left-0 rtl:right-auto"
								onClick={() => closeCurrentTour('closed-manually')}
								aria-label={__('Close Modal', 'extendify-local')}
							>
								<Icon icon={close} className="h-4 w-4 fill-current" />
							</button>
							<Dialog.Title className="sr-only">
								{currentTour?.title ?? __('Tour', 'extendify-local')}
							</Dialog.Title>
							{image && (
								<div
									className="w-full p-6"
									style={{
										minHeight: 150,
										background:
											'linear-gradient(58.72deg, #485563 7.71%, #29323C 92.87%)',
									}}
								>
									<img src={image} className="block w-full" alt={title} />
								</div>
							)}
							<div className="relative m-0 bg-white p-6 pt-0 text-left rtl:text-right">
								{title && <h2 className="mb-2 text-xl font-medium">{title}</h2>}
								{text && <p className="mb-6">{text}</p>}
								<BottomNav initialFocus={initialFocus} />
							</div>
						</motion.div>
					</div>
					{options?.allowPointerEvents || (
						<div aria-hidden={true} className="fixed inset-0 z-max-1" />
					)}
					{Boolean(currentTour) && overlayRect?.left !== undefined && (
						<>
							<motion.div
								initial={{
									opacity: 0,
									clipPath:
										'polygon(0px 0px, 100% 0px, 100% 100%, 0px 100%, 0 0)',
								}}
								animate={{
									opacity: 1,
									clipPath: `polygon(0px 0px, 100% 0px, 100% 100%, 0px 100%, 0 0, ${rectWithPadding.left}px 0, ${rectWithPadding.left}px ${rectWithPadding?.bottom}px, ${rectWithPadding?.right}px ${rectWithPadding.bottom}px, ${rectWithPadding.right}px ${rectWithPadding.top}px, ${rectWithPadding.left}px ${rectWithPadding.top}px)`,
								}}
								transition={{
									duration: finishedStepOne.current ? 0.5 : 0,
									ease: 'easeInOut',
								}}
								className="fixed inset-0 z-max-1 hidden bg-black/70 lg:block"
								aria-hidden="true"
							/>
							<BorderOutline
								rectWithPadding={rectWithPadding}
								finishedStepOne={finishedStepOne}
							/>
						</>
					)}
				</Dialog>
			)}
		</AnimatePresence>
	);
};

const BorderOutline = ({ rectWithPadding, finishedStepOne }) => {
	const [visible, setVisible] = useState(false);
	return (
		<motion.div
			initial={{ ...(rectWithPadding ?? {}) }}
			animate={{ ...(rectWithPadding ?? {}) }}
			transition={{
				duration: finishedStepOne.current ? 0.5 : 0,
				ease: 'easeInOut',
			}}
			onAnimationStart={() => setVisible(false)}
			onAnimationComplete={() => setVisible(true)}
			className={classNames('fixed inset-0 z-high hidden border-2 lg:block', {
				'border-transparent': !visible,
				'border-design-main': visible,
				'inset-y-auto right-0': isRTL(),
			})}
			aria-hidden="true"
		/>
	);
};

const BottomNav = ({ initialFocus }) => {
	const {
		goToStep,
		completeCurrentTour,
		currentStep,
		preparingStep,
		getStepData,
		hasNextStep,
		nextStep,
		hasPreviousStep,
		prevStep,
		currentTour,
	} = useTourStore();
	const { options = {} } = getStepData(currentStep);
	const { hideBackButton = false } = options;
	const { steps, settings } = currentTour || {};

	return (
		<div
			id="extendify-tour-navigation"
			className="flex w-full items-center justify-between"
		>
			<div className="flex flex-1 justify-start rtl:flex-none">
				<AnimatePresence>
					{hasPreviousStep() && !hideBackButton && (
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
							<button
								type="button"
								className="flex h-8 items-center justify-center gap-2 rounded-xs bg-transparent p-0 text-gray-900 ring-design-main hover:bg-transparent focus:outline-hidden focus:ring-wp focus:ring-offset-1 focus:ring-offset-white disabled:opacity-60"
								onClick={prevStep}
								disabled={preparingStep > -1}
							>
								{preparingStep < currentStep && (
									<Spinner className="m-0 h-4 text-design-main" />
								)}
								<span>{__('Back', 'extendify-local')}</span>
							</button>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{steps?.length > 2 && !settings?.hideDotsNav ? (
				<nav
					aria-label={__('Tour Steps', 'extendify-local')}
					className="flex flex-1 -translate-x-3 items-center justify-center gap-1"
				>
					{steps.map((_step, index) => (
						<div key={index}>
							<button
								type="button"
								aria-label={sprintf(
									// translators: %1$s is the current step, %2$s is the total number of steps
									__('%1$s of %2$s', 'extendify-local'),
									index + 1,
									steps.length,
								)}
								aria-current={index === currentStep}
								className={`m-0 block h-2.5 w-2.5 rounded-full p-0 ring-offset-1 ring-offset-white focus:outline-hidden focus:ring-wp focus:ring-design-main ${
									index === currentStep ? 'bg-design-main' : 'bg-gray-300'
								}`}
								onClick={() => goToStep(index)}
								disabled={preparingStep > -1}
							/>
						</div>
					))}
				</nav>
			) : null}

			<div className="flex flex-1 justify-end rtl:flex-none">
				{hasNextStep() ? (
					<Button
						ref={initialFocus}
						id="agent-tour-next-button"
						data-test="agent-tour-next-button"
						onClick={nextStep}
						disabled={preparingStep > -1}
						className="flex gap-2 bg-design-main text-design-text focus:text-design-text disabled:opacity-60"
						variant="primary"
					>
						{preparingStep > currentStep && (
							<Spinner className="m-0 h-4 text-design-main" />
						)}
						<span>{__('Next', 'extendify-local')}</span>
					</Button>
				) : (
					<Button
						id="agent-tour-next-button"
						data-test="agent-tour-next-button"
						onClick={() => {
							completeCurrentTour();
						}}
						className="bg-design-main"
						variant="primary"
					>
						{__('Done', 'extendify-local')}
					</Button>
				)}
			</div>
		</div>
	);
};

const addPaddingToRect = (rect, padding) => ({
	top: rect.top - (padding?.top ?? 0),
	left: rect.left - (padding?.left ?? 0),
	right: rect.right + (padding?.right ?? 0),
	bottom: rect.bottom + (padding?.bottom ?? 0),
	width: rect.width + (padding?.left ?? 0) + (padding?.right ?? 0),
	height: rect.height + (padding?.top ?? 0) + (padding?.bottom ?? 0),
	x: rect.x - (padding?.left ?? 0),
	y: rect.y - (padding?.top ?? 0),
});
