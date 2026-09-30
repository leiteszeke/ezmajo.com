import { Questionnaire } from '@launch/components/Questionnaire';
import { Title } from '@launch/components/Title';
import { PageLayout } from '@launch/layouts/PageLayout';
import { pageState } from '@launch/state/factory';
import { useUserSelectionStore } from '@launch/state/user-selections';
import { useCallback, useEffect, useMemo, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export const state = pageState('Site Questions', () => ({
	ready: false,
	canSkip: false,
	useNav: true,
	onRemove: () => {},
}));

export const SiteQuestions = () => {
	const {
		siteQA,
		setSiteQuestionAnswer,
		setShowHiddenQuestions,
		setSiteStructure,
		setSiteObjective,
		setCTALink,
		siteObjective,
		siteStructure,
		urlParameters,
	} = useUserSelectionStore();

	const pageTitle = __(
		"Let's review your AI-powered recommendations",
		'extendify-local',
	);

	const pageDescription = __(
		'Using the details you provided, our AI suggested the best settings for your site. Take a quick look and confirm everything looks right before moving on.',
		'extendify-local',
	);

	const showHiddenQuestions = siteQA?.showHidden;
	const hasHiddenQuestions =
		Array.isArray(siteQA?.questions) &&
		siteQA.questions.some((q) => q.group === 'hidden');

	let questionsToRender = showHiddenQuestions
		? siteQA?.questions
		: siteQA?.questions?.filter((q) => q.group === 'visible');

	const hasQuestions =
		Array.isArray(questionsToRender) && questionsToRender.length > 0;

	const allAnswered =
		hasQuestions &&
		questionsToRender.every(
			(question) => question?.answerUser || question?.answerAI,
		);

	const componentMounted = useRef(false);

	useEffect(() => {
		state.setState({ ready: allAnswered });
	}, [allAnswered]);

	const applyAnswerEffects = useCallback(
		(questionId, answerId, options = {}) => {
			if (questionId === 'pages') {
				if (answerId === 'multiple-pages') setSiteStructure('multi-page');
				if (answerId === 'one-page') setSiteStructure('single-page');
			}

			if (questionId === 'external-cta' && options?.isExtraField) {
				setCTALink(answerId);
			}
		},
		[setSiteStructure, setCTALink],
	);

	const handleChanges = (questionId, answerId, options = {}) => {
		setSiteQuestionAnswer(questionId, answerId, options);
		applyAnswerEffects(questionId, answerId, options);
	};

	const pagesAnswer = useMemo(() => {
		return (
			questionsToRender?.find((q) => q.id === 'pages')?.answerUser ||
			questionsToRender?.find((q) => q.id === 'pages')?.answerAI
		);
	}, [questionsToRender]);

	/**
	 * Temporary logic to force siteObjective to 'landing-page' and trigger
	 * the current LP flow. This will be replaced and removed in v2 of Landing Page flow.
	 */
	const checkAndSetLP = useCallback(() => {
		if (!questionsToRender || !questionsToRender.length) return;

		const ctaAnswer =
			questionsToRender.find((q) => q.id === 'external-cta')?.answerUser ||
			questionsToRender.find((q) => q.id === 'external-cta')?.answerAI;

		const otherQuestions = questionsToRender.filter(
			(q) => !['pages', 'external-cta'].includes(q.id),
		);
		const allOthersNo = otherQuestions.every((q) => {
			const ans = q?.answerUser || q?.answerAI;
			return ans === 'no';
		});

		let newSiteObjective;
		if (pagesAnswer === 'one-page' && ctaAnswer === 'yes' && allOthersNo) {
			newSiteObjective = 'landing-page';
		}

		setSiteObjective(newSiteObjective);
	}, [pagesAnswer, questionsToRender, setSiteObjective]);

	useEffect(() => {
		if (!hasQuestions) return;

		checkAndSetLP();
	}, [checkAndSetLP, hasQuestions]);

	useEffect(() => {
		if (!hasQuestions || componentMounted.current) return;

		questionsToRender.forEach((question) => {
			const answer = question?.answerUser || question?.answerAI;
			if (!answer) return;

			if (question.id === 'products' && siteObjective === 'ecommerce') {
				setSiteQuestionAnswer(question.id, 'yes-shopping-cart');
			}

			if (question.id === 'pages') {
				const mappedAnswer = {
					'single-page': 'one-page',
					'multi-page': 'multiple-pages',
				};

				if (mappedAnswer?.[siteStructure]) {
					setSiteQuestionAnswer(question.id, mappedAnswer[siteStructure]);
					return;
				}
			}

			applyAnswerEffects(question.id, answer);
		});

		componentMounted.current = true;
	}, [
		applyAnswerEffects,
		hasQuestions,
		questionsToRender,
		siteObjective,
		setSiteQuestionAnswer,
		siteStructure,
	]);

	/**
	 * Check if the URL parameters contain a valid structure.
	 * If a valid structure is found, filter out the 'pages' question.
	 */
	const hasValidStructureUrlParameter =
		urlParameters?.structure === 'multi-page' ||
		urlParameters?.structure === 'single-page';
	if (hasValidStructureUrlParameter) {
		questionsToRender = questionsToRender.filter(
			(question) => question.id !== 'pages',
		);
	}

	if (hasQuestions && pagesAnswer === 'multiple-pages') {
		questionsToRender = questionsToRender.filter(
			(question) => question.id !== 'external-cta',
		);
	}

	return (
		<PageLayout>
			<div className="grow overflow-y-auto px-6 py-8 md:p-12 3xl:p-16">
				<Title title={pageTitle} description={pageDescription} />
				{!hasQuestions && (
					<div className="text-center text-gray-500">
						{__('Loading...', 'extendify-local')}
					</div>
				)}
				{hasQuestions && (
					<>
						<Questionnaire
							questions={questionsToRender}
							onAnswerChange={handleChanges}
						/>

						{hasHiddenQuestions && !showHiddenQuestions && (
							<div className="flex justify-center">
								<button
									type="button"
									className="mt-12 flex flex-col items-center bg-transparent text-base font-medium text-design-main"
									onClick={() => setShowHiddenQuestions(true)}
								>
									{__('Show more questions', 'extendify-local')}
									<svg
										className="fill-current"
										width="32"
										height="32"
										viewBox="0 0 32 32"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<title>{__('Down Arrow Icon', 'extendify-local')}</title>
										<path d="M23.3327 15.4672L15.9993 21.3339L8.66602 15.4672L9.86602 13.8672L15.9993 18.6672L21.9993 13.8672L23.3327 15.4672Z" />
									</svg>
								</button>
							</div>
						)}
					</>
				)}
			</div>
		</PageLayout>
	);
};
