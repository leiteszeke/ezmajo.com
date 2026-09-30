import { decodeEntities } from '@wordpress/html-entities';

export const UserMessage = ({ message }) => {
	const { content, role, hidden } = message.details;
	if (hidden) return null;
	return (
		<div
			data-agent-message-role={role}
			className="flex w-full flex-col items-end p-2"
		>
			<div className="max-w-[80%] break-words rounded-xl bg-gray-100 p-1.5 px-2.5 text-gray-900">
				{decodeEntities(content)}
			</div>
		</div>
	);
};
