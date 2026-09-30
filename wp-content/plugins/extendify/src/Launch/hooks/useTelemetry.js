import { INSIGHTS_HOST } from '@constants';
import { useGlobalStore } from '@launch/state/Global';
import { usePagesStore } from '@launch/state/Pages';
import { usePagesSelectionStore } from '@launch/state/pages-selections';
import { useUserSelectionStore } from '@launch/state/user-selections';
import { useEffect, useRef, useState } from '@wordpress/element';

// Dev note: This entire section is opt-in only when partnerID is set as a constant
export const useTelemetry = () => {
	const {
		sitePlugins,
		siteStructure,
		variation,
		siteProfile,
		siteObjective,
		siteQA,
		attempt,
		urlParameters,
	} = useUserSelectionStore();
	const { pages: selectedPages, style: selectedStyle } =
		usePagesSelectionStore();
	const { generating } = useGlobalStore();
	const { pages, currentPageIndex, preselectedPages } = usePagesStore();
	const [stepProgress, setStepProgress] = useState([]);
	const [viewedStyles, setViewedStyles] = useState(new Set());
	const running = useRef(false);
	const firstRun = useRef(true);

	useEffect(() => {
		const p = [...pages].map((p) => p[0]);
		// Add pages as they move around
		setStepProgress((progress) => {
			const withoutSkipped = progress.filter((p) => !preselectedPages.has(p));
			// Return early if launched, or on the same page
			if ([p[currentPageIndex], 'launched'].includes(progress?.at(-1))) {
				return withoutSkipped;
			}
			return [...withoutSkipped, p[currentPageIndex]];
		});
	}, [currentPageIndex, pages, preselectedPages]);

	useEffect(() => {
		if (!generating) return;
		// They pressed Launch
		setStepProgress((progress) => [...progress, 'launched']);
	}, [generating]);

	useEffect(() => {
		if (!Object.keys(selectedStyle ?? {})?.length) return;
		// Add selectedStyle to the set
		setViewedStyles((styles) => {
			const newStyles = new Set(styles);
			newStyles.add(selectedStyle);
			return newStyles;
		});
	}, [selectedStyle]);

	useEffect(() => {
		let id = 0;
		let innerId = 0;
		const timeout = firstRun.current
			? // Send the first request immediately,
				0
			: // if on page 0, wait 2s
				currentPageIndex === 0
				? 2000
				: // Every other request will be 1s
					1000;
		firstRun.current = false;
		id = window.setTimeout(() => {
			if (running.current) return;
			running.current = true;
			const controller = new AbortController();
			innerId = window.setTimeout(() => {
				running.current = false;
				controller.abort();
			}, 900);

			fetch(`${INSIGHTS_HOST}/api/v1/launch`, {
				method: 'POST',
				headers: {
					'Content-type': 'application/json',
					Accept: 'application/json',
					'X-Extendify': 'true',
				},
				signal: controller.signal,
				body: JSON.stringify({
					siteType: siteProfile?.aiSiteType,
					siteCategory: siteProfile?.aiSiteCategory,
					siteCreatedAt: window.extSharedData?.siteCreatedAt,
					style: variation?.title,
					siteStructure,
					siteObjective,
					pages: selectedPages?.map((p) => p.slug),
					sitePlugins: sitePlugins?.map((p) => p?.name),
					lastCompletedStep: stepProgress?.at(-1),
					progress: stepProgress,
					preSelect: [...preselectedPages],
					stylesViewed: [...viewedStyles]
						.filter((s) => s?.variation)
						.map((s) => s.variation.title),
					insightsId: window.extSharedData?.siteId,
					activeTests:
						window.extOnbData?.activeTests?.length > 0
							? JSON.stringify(window.extOnbData?.activeTests)
							: undefined,
					hostPartner: window.extSharedData?.partnerId,
					language: window.extSharedData?.wpLanguage,
					siteURL: window.extSharedData?.homeUrl,
					siteQuestions: siteQA?.questions.map((q) => ({
						id: q?.id,
						question: q?.question,
						answerUser: q?.answerUser || null,
						answerAI: q?.answerAI || null,
						group: q?.group || null,
						extraFields: q?.extraFields
							? q?.extraFields.map((ef) => ({
									question: ef?.id,
									answer: ef?.answer || null,
								}))
							: null,
					})),
					showHiddenQuestions: Boolean(siteQA?.showHidden),
					attempt,
					enabledFeatures: window.extSharedData?.showSiteQuestions
						? ['site-questions']
						: [],
					urlParameters: Object.fromEntries(
						Object.entries(urlParameters)
							.map(([key, value]) => {
								if (key === 'tone' && Array.isArray(value)) {
									return [key, value.map((t) => t.value)];
								}
								if (key === 'skip' && Array.isArray(value)) {
									return [key, value];
								}
								return [key, value];
							})
							.filter(
								([_, value]) =>
									value !== null &&
									value !== '' &&
									(!Array.isArray(value) || value.length > 0),
							),
					),
					extra: {
						userAgent: window?.navigator?.userAgent,
						vendor: window?.navigator?.vendor || 'unknown',
						platform:
							window?.navigator?.userAgentData?.platform ||
							window?.navigator?.platform ||
							'unknown',
						mobile: window?.navigator?.userAgentData?.mobile,
						width: window.innerWidth,
						height: window.innerHeight,
						screenHeight: window.screen.height,
						screenWidth: window.screen.width,
						orientation: window.screen.orientation?.type,
						touchSupport:
							'ontouchstart' in window || navigator.maxTouchPoints > 0,
					},
				}),
			})
				.catch(() => undefined)
				.finally(() => {
					running.current = false;
				});
		}, timeout);
		return () => {
			running.current = false;
			[id, innerId].forEach((i) => {
				window.clearTimeout(i);
			});
		};
	}, [
		selectedPages,
		selectedStyle,
		pages,
		stepProgress,
		viewedStyles,
		currentPageIndex,
		sitePlugins,
		siteProfile?.aiSiteType,
		siteProfile?.aiSiteCategory,
		siteStructure,
		siteObjective,
		variation,
		preselectedPages,
		siteQA,
		attempt,
		urlParameters,
	]);
};
