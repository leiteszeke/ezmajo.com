import { arrow } from '@help-center/components/ai-chat/icons';
import { useAIChatStore } from '@help-center/state/ai-chat';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { close, Icon } from '@wordpress/icons';

export const History = ({ setShowHistory }) => {
	const { history, setCurrentQuestion, deleteFromHistory } = useAIChatStore();

	useEffect(() => {
		if (history.length > 0) return;
		// They cleared all the history
		setTimeout(() => setShowHistory(false), 750);
	}, [history, setShowHistory]);

	return (
		<div className="relative h-full">
			<div className="flex items-center justify-between bg-gray-100 p-4 px-6 text-gray-900">
				<h1 className="m-0 p-0 text-sm font-medium">
					{__('Chat History', 'extendify-local')}
				</h1>
				<button
					type="button"
					onClick={() => setShowHistory(false)}
					className="m-0 border-0 bg-transparent fill-current p-0 text-design-text"
				>
					<Icon icon={close} size={16} />
					<span className="sr-only">
						{__('Close history', 'extendify-local')}
					</span>
				</button>
			</div>
			<ul className="m-0 mt-3 h-full overflow-y-auto p-0">
				{[...history]
					.sort((a, b) => a.time - b.time)
					.map((item) => (
						<li
							key={item.answerId}
							className="group flex gap-1 px-2 pr-4 rtl:flex-row-reverse"
						>
							<button
								type="button"
								onClick={() => deleteFromHistory(item)}
								className="m-0 border-0 bg-transparent p-0 opacity-0 group-hover:opacity-100"
							>
								<Icon icon={close} size={12} />
								<span className="sr-only">
									{__('Remove from history', 'extendify-local')}
								</span>
							</button>
							<button
								type="button"
								className="m-0 flex w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-transparent p-2.5 text-left hover:bg-gray-100"
								onClick={() => setCurrentQuestion(item)}
							>
								<div>
									<span className="overflow-hidden truncate text-ellipsis">
										{item.question.substring(0, 100)}
									</span>
								</div>
								<span>
									<Icon
										className="fill-current text-gray-900 rtl:rotate-180"
										icon={arrow}
									/>
								</span>
							</button>
						</li>
					))}
			</ul>
		</div>
	);
};
