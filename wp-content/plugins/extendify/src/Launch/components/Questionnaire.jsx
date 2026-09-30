import { Icon as QuestionIcon } from '@launch/components/QuestionIcon';

export const Questionnaire = ({ questions = [], onAnswerChange }) => {
	const getSelectedExtraField = (q, selected) => {
		if (!Array.isArray(q?.extraFields) || !selected) return null;
		return q?.extraFields.find((ef) => ef.key === selected) || null;
	};

	return (
		<div className="mx-auto flex max-w-full flex-col gap-6 lg:max-w-[961px]">
			{questions.map((q) => {
				const selected = q?.answerUser || q?.answerAI;
				const selectedExtraField = getSelectedExtraField(q, selected);

				return (
					<div
						className="flex flex-col gap-3 rounded-sm bg-[#f8f8f8] p-6"
						key={q.id}
					>
						<p className="m-0 text-base font-medium text-extendify-black">
							{q?.translatedQuestion || q?.question}
						</p>

						{q?.description && (
							<p className="mb-0 ml-0 mr-0 mt-[-8px] p-0 text-sm font-normal text-gray-700">
								{q?.description}
							</p>
						)}

						<div className="flex flex-wrap gap-5">
							{q?.answerOptions.map((answer) => (
								<button
									key={answer?.id}
									type="button"
									onClick={() => onAnswerChange?.(q?.id, answer?.id)}
									className={[
										selected === answer?.id
											? 'border-2 border-design-main font-medium text-design-main before:absolute before:inset-0 before:bg-design-main before:opacity-[0.06] before:content-[""]'
											: 'border border-gray-200 bg-white font-normal',
										'relative flex w-full max-w-full items-center gap-2 rounded-md px-3 py-3 text-left text-sm transition-colors duration-150 focus:outline-hidden md:max-w-[291px]',
									].join(' ')}
								>
									<QuestionIcon id={answer?.iconId} />
									{answer?.translatedLabel || answer?.label}
								</button>
							))}
						</div>

						{selectedExtraField && (
							<div className="mt-2">
								<label
									className="mb-3 block text-base font-medium text-extendify-black"
									htmlFor={`extra-field-${q.id}`}
								>
									{selectedExtraField?.translatedQuestion ||
										selectedExtraField?.question}
								</label>
								<input
									id={`extra-field-${q.id}`}
									type={selectedExtraField?.type || 'text'}
									placeholder="www.example.com"
									value={selectedExtraField?.answer || ''}
									onChange={(e) =>
										onAnswerChange?.(q?.id, e.target.value, {
											isExtraField: true,
											extraFieldKey: selectedExtraField?.key,
										})
									}
									className="w-full max-w-[602px] rounded-sm border border-gray-300 px-2 py-2 outline-hidden"
								/>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
};
