import { getExtendifyCodeRecommendation } from '@auto-launch/functions/extendify-code';
import { getAbTest } from '@auto-launch/functions/getAbTest';
import { fetchWithTimeout } from '@auto-launch/functions/helpers';
import { useLaunchDataStore } from '@auto-launch/state/launch-data';
import { launchStrings } from '@auto-launch/strings';
import { AI_HOST } from '@constants';
import { reqDataBasics } from '@shared/lib/data';
import { useAIConsentStore } from '@shared/state/ai-consent';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { isURL } from '@wordpress/url';

const getShowTitle = () => Boolean(window.extLaunchData?.showLaunchTitle);

// A round trip can finish in under a frame, and the loader reads as a glitch.
const MIN_LOADER_MS = 2000;
const heldFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getSubmitLabel = () =>
	getAbTest('AutoLaunch.SubmitCreateWebsite').variant === 'B'
		? launchStrings().submitAlternate
		: launchStrings().submit;

const getPlaceholder = () =>
	getAbTest('AutoLaunch.DescriptionPlaceholderLaw').variant === 'B'
		? launchStrings().placeholderAlternate
		: launchStrings().placeholder;

export const useDescriptionForm = () => {
	const { setData, descriptionBackup, urlParams } = useLaunchDataStore();
	const [input, setInput] = useState(
		urlParams.description ||
			(!getShowTitle() && urlParams.title) ||
			descriptionBackup ||
			'',
	);
	const blogname = window.extSharedData?.siteTitle || '';
	const titlePrefill =
		!blogname || isURL(blogname) ? '' : decodeEntities(blogname);
	const [title, setTitle] = useState(urlParams.title || titlePrefill);
	const [improving, setImproving] = useState(false);
	const [checking, setChecking] = useState(false);
	const [lastImproved, setLastImproved] = useState(null);
	const textareaRef = useRef(null);
	const { consentTerms } = useAIConsentStore();
	// The title field makes the description optional, so the submit gate follows it.
	const showTitle = getShowTitle();
	const waiting = checking || improving;
	// The overlay stops a pointer, not Enter on a still-enabled button.
	const submitDisabled =
		waiting ||
		(showTitle ? title.trim().length === 0 : input.trim().length === 0);
	const waitingMessage = checking
		? launchStrings().reviewing
		: launchStrings().enhancing;

	const adjustHeight = useCallback(() => {
		const el = textareaRef.current;
		if (!el) return;
		const bottomPadding = 120;
		// Reset to measure natural height
		el.style.height = 'auto';

		const rect = el.getBoundingClientRect();
		const viewportHeight = window.innerHeight;

		const maxAvailable = Math.max(0, viewportHeight - rect.top - bottomPadding);
		const desired = el.scrollHeight;
		const nextHeight = Math.min(desired, maxAvailable);

		el.style.height = `${nextHeight}px`;
		el.style.overflowY = desired > maxAvailable ? 'auto' : 'hidden';
	}, []);

	const submitForm = async (e) => {
		e.preventDefault();
		const trimmedTitle = title.trim();
		const trimmedInput = input.trim();
		if (showTitle) setData('title', trimmedTitle);
		setData('descriptionRaw', trimmedInput);

		// Only `showExtendifyCode` partners pay the classification latency; on a
		// `1` we divert to the connector screen instead of starting site creation.
		if (window.extSharedData?.showExtendifyCode) {
			setChecking(true);
			const [recommend] = await Promise.all([
				getExtendifyCodeRecommendation(trimmedInput || trimmedTitle),
				heldFor(MIN_LOADER_MS),
			]);
			// Left on either way: clearing it first shows the form again for the
			// length of the page fade, which reads as a second, wrong screen.
			if (recommend === 1) {
				setData('showExtendifyCodeScreen', true);
				return;
			}
		}
		setData('go', true);
	};

	const handleImprove = async () => {
		setImproving(true);
		const url = `${AI_HOST}/api/prompt/improve`;
		const method = 'POST';
		const headers = { 'Content-Type': 'application/json' };
		const response = await fetchWithTimeout(url, {
			method,
			headers,
			body: JSON.stringify({
				...reqDataBasics,
				description: input.trim(),
				title: window.extSharedData.siteTitle,
			}),
		})
			.then((res) => res.ok && res.json())
			.catch(() => null);
		const nextValue = response?.improvedPrompt;
		setImproving(false);
		if (nextValue) {
			setLastImproved(nextValue);
			const el = textareaRef.current;
			if (!el) return setInput(nextValue);
			requestAnimationFrame(() => {
				// Preserve undo ability by using native events instead of React state
				el.focus();
				el.select();
				const ok = document.execCommand('insertText', false, nextValue);
				if (!ok) setInput(nextValue);
			});
		}
	};

	useEffect(() => {
		setData('descriptionBackup', input.trim());
		const raf = requestAnimationFrame(() => {
			adjustHeight();
		});
		return () => cancelAnimationFrame(raf);
	}, [input, setData]);

	useEffect(() => {
		const controller = new AbortController();
		const { signal } = controller;
		const handleResize = () => {
			adjustHeight();
			const c = textareaRef.current;
			c?.scrollTo(0, c.scrollHeight);
		};
		window.addEventListener('resize', handleResize, { signal });
		window.addEventListener('orientationchange', handleResize, { signal });
		adjustHeight();
		return () => controller.abort();
	}, [adjustHeight]);

	return {
		showTitle,
		title,
		onTitleChange: (value) => {
			setTitle(value);
			setData('title', value);
		},
		description: input,
		onDescriptionChange: setInput,
		descriptionRef: textareaRef,
		placeholder: getPlaceholder(),
		submitLabel: getSubmitLabel(),
		submitDisabled,
		onSubmit: submitForm,
		showEnhance: getAbTest('AutoLaunch.HideEnhanceAI').variant !== 'B',
		enhanceDisabled: input.trim().length === 0 || input.trim() === lastImproved,
		onEnhance: handleImprove,
		consentTerms,
		strings: launchStrings(),
		waiting,
		waitingMessage,
	};
};
