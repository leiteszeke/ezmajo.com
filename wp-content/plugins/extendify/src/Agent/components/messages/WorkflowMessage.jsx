import { ChatSuggestions } from '@agent/components/ChatSuggestions';
import { Rating } from '@agent/components/Rating';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';

// Note: this used to have more status like joined, cancelled, transferred etc.
export const WorkflowMessage = ({ message }) => {
	const { answerId, suggestions, status, label } = message.details;

	if (status === 'canceled') {
		return (
			<>
				<WorkflowToolCanceled label={label} />
				<WorkflowFooter answerId={answerId} suggestions={suggestions} />
			</>
		);
	}

	return (
		<>
			{/* No label on a static-component finish — its own message shows the result. */}
			{label && <WorkflowToolCompleted label={label} />}
			<WorkflowFooter answerId={answerId} suggestions={suggestions} />
		</>
	);
};

const WorkflowFooter = ({ answerId, suggestions }) => {
	const hasSuggestions = suggestions?.length > 0;
	if (!answerId && !hasSuggestions) return null;

	return (
		<div className="flex flex-col gap-px p-2 text-center text-xs italic">
			{answerId && <Rating answerId={answerId} />}
			{hasSuggestions && (
				<div className="relative mb-4 ms-10 mt-4 flex flex-col gap-0.5 border-t border-gray-300 p-0 pt-4 text-sm text-gray-800">
					<p className="m-0 mb-2 p-0 px-2 text-left text-sm not-italic text-gray-900 rtl:text-right">
						{__(
							"What's next? Would you like to do something else?",
							'extendify-local',
						)}
					</p>
					<ChatSuggestions suggestions={suggestions} />
				</div>
			)}
		</div>
	);
};

const WorkflowToolCompleted = ({ label }) => {
	return (
		<div className="flex w-full items-start gap-2.5 px-2.5 py-2">
			<div className="w-7 shrink-0" />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-center gap-2 border-l-4 border-l-wp-alert-green bg-wp-notice-success p-3 text-gray-900">
					<div className="h-6 w-6 leading-none text-wp-alert-green">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={1.5}
							stroke="currentColor"
							className="size-6"
						>
							<title>{__('Success icon', 'extendify-local')}</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
							/>
						</svg>
					</div>
					<div className="text-sm">
						{decodeEntities(label) ||
							__('Your site was updated', 'extendify-local')}
					</div>
				</div>
			</div>
		</div>
	);
};

const WorkflowToolCanceled = ({ label }) => {
	return (
		<div className="flex w-full items-start gap-2.5 px-2.5 py-2">
			<div className="w-7 shrink-0" />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-center gap-2 border-l-4 border-l-wp-notice-neutral bg-gray-50 p-3 text-gray-900">
					<div className="text-sm">
						{decodeEntities(label) ||
							__('Canceled — nothing was changed', 'extendify-local')}
					</div>
				</div>
			</div>
		</div>
	);
};
