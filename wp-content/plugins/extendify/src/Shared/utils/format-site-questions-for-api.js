/**
 * Formats the site questions object into a simplified array structure
 * to be sent to the API. It prioritizes `answerUser`, falling back to `answerAI`.
 *
 * @param {Object} siteQA - The full siteQA object from user selection store.
 * @param {Array<Object>} siteQA.questions - Array of question objects.
 * @param {string} siteQA.questions[].question - The question text.
 * @param {string} [siteQA.questions[].answerUser] - User-provided answer.
 * @param {string} [siteQA.questions[].answerAI] - AI-generated fallback answer.
 * @returns {Array<{ question: string, answer: string }>} Formatted list of questions and answers.
 */
export const formatSiteQuestionsForAPI = (siteQA) => {
	if (!Array.isArray(siteQA?.questions) || siteQA.questions.length === 0) {
		return [];
	}

	return siteQA.questions.map((q) => ({
		id: q?.id ?? '',
		question: q?.question ?? '',
		answer: q?.answerUser ?? q?.answerAI ?? '',
	}));
};
