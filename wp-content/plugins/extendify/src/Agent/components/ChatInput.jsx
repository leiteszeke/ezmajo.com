import { useCanvasAssist } from '@agent/components/Canvas';
import { PageDocument } from '@agent/components/PageDocument';
import { cancelRequest } from '@agent/icons';
import { useChatStore } from '@agent/state/chat';
import { useWorkflowStore } from '@agent/state/workflows';
import { askAiTarget } from '@quick-edit/lib/hover-bar';
import { useQuickEditStore } from '@quick-edit/state/store';
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { arrowUp, Icon } from '@wordpress/icons';
import classNames from 'classnames';

const placeholderFor = ({ disabled, editing, block }) => {
	// `disabled` also covers being out of credits, so it outranks the rest.
	if (disabled) return __('Ask anything', 'extendify-local');
	if (editing) {
		// translators: Shown in the AI chat box while a Quick Edit editor is open on a block.
		return __('Finish editing first', 'extendify-local');
	}
	if (block) {
		return __(
			'What do you want to change in the selected content?',
			'extendify-local',
		);
	}
	return __('Ask anything', 'extendify-local');
};

export const ChatInput = ({ disabled, handleSubmit }) => {
	const textareaRef = useRef(null);
	const [input, setInput] = useState('');
	const [history, setHistory] = useState([]);
	const dirtyRef = useRef(false);
	const [historyIndex, setHistoryIndex] = useState(null);
	const { workflow } = useWorkflowStore();
	const canvasAssist = useCanvasAssist();
	const block = useQuickEditStore((s) => s.agentBlock);
	// Quick Edit's modals mount off `selected` too, so this covers them.
	const editing = useQuickEditStore((s) => Boolean(s.selected));
	const INPUT_LIMIT = 1500;
	const inputTrimmed = input.trim();
	const overLimit = inputTrimmed.length > INPUT_LIMIT;
	// The workflow stays set with a canvas open, so this would show cancel.
	const busy = disabled || (Boolean(workflow?.id) && !canvasAssist);
	const inputDisabled = disabled || editing;

	// resize the height of the textarea based on the content
	const adjustHeight = useCallback(() => {
		if (!textareaRef.current) return;
		textareaRef.current.style.height = 'auto';
		// while empty, scrollHeight measures the wrapped placeholder and overshoots
		if (!textareaRef.current.value) return;
		const chat =
			textareaRef.current.closest('#extendify-agent-chat').offsetHeight * 0.55;
		const h = Math.min(chat, textareaRef.current.scrollHeight);
		textareaRef.current.style.height = `${block && h < 60 ? 60 : h}px`;
	}, [block]);

	useLayoutEffect(() => {
		window.addEventListener('extendify-agent:resize-end', adjustHeight);
		adjustHeight();
		return () =>
			window.removeEventListener('extendify-agent:resize-end', adjustHeight);
	}, [adjustHeight]);

	useEffect(() => {
		adjustHeight();
	}, [input, adjustHeight]);

	// Derive the up-arrow history from the chat store so it survives reload —
	// a one-shot DOM read missed messages that hydrate in asynchronously.
	const messages = useChatStore((s) => s.messages);
	useEffect(() => {
		const userMessages = messages
			.filter((m) => m.type === 'message' && m.details?.role === 'user')
			.map((m) => m.details.content ?? '');
		setHistory(
			userMessages.filter((msg, i, arr) => i === 0 || msg !== arr[i - 1]),
		);
		setHistoryIndex(null);
	}, [messages]);

	const submitForm = useCallback(
		(e) => {
			e?.preventDefault();
			if (!input.trim() || overLimit) return;
			handleSubmit(input.trim());
			setHistory((prev) => {
				// avoid duplicates
				if (prev?.at(-1) === input) return prev;
				return [...prev, input];
			});
			setHistoryIndex(null);
			setInput('');
			requestAnimationFrame(() => {
				dirtyRef.current = false;
				adjustHeight();
				textareaRef.current?.focus();
			});
		},
		[input, handleSubmit, adjustHeight, overLimit],
	);

	const handleKeyDown = useCallback(
		(event) => {
			if (
				event.key === 'Enter' &&
				!event.shiftKey &&
				!event.nativeEvent.isComposing
			) {
				event.preventDefault();
				if (!overLimit) submitForm();
				return;
			}
			if (dirtyRef.current) return;
			if (event.key === 'ArrowUp') {
				if (!history.length) return;
				if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)
					return;
				setHistoryIndex((prev) => {
					const next =
						prev === null ? history.length - 1 : Math.max(prev - 1, 0);
					setInput(history[next]);
					return next;
				});
				event.preventDefault();
				return;
			}
			if (event.key === 'ArrowDown') {
				if (historyIndex === null) return;
				if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)
					return;
				setHistoryIndex((prev) => {
					if (prev === null) return null;
					const next = prev + 1;
					if (next >= history.length) {
						setInput('');
						return null;
					}
					setInput(history[next]);
					return next;
				});
				event.preventDefault();
				return;
			}
			dirtyRef.current = true;
		},
		[history, historyIndex, submitForm, overLimit],
	);

	// Typing beside a pinned bar is a request about that block.
	const stagePinnedSelection = useCallback(() => {
		const { committedSelection, agentBlock } = useQuickEditStore.getState();
		if (!committedSelection?.el || agentBlock) return;
		askAiTarget(committedSelection.el);
	}, []);

	const handleCancel = useCallback((e) => {
		e.stopPropagation();
		window.dispatchEvent(new CustomEvent('extendify-agent:cancel-workflow'));
	}, []);

	return (
		// biome-ignore lint: allow onClick without keyboard
		<form
			onSubmit={submitForm}
			onClick={() => textareaRef.current?.focus()}
			className={classNames(
				'relative flex w-full flex-col rounded-sm border border-gray-300 focus-within:outline-design-main focus:rounded-sm focus:border-design-main focus:ring-design-main',
				{
					'bg-gray-300': inputDisabled,
					'bg-gray-50': !inputDisabled,
				},
			)}
		>
			{block ? (
				<div className="px-2 pt-2">
					<PageDocument busy={busy} />
				</div>
			) : null}
			<textarea
				ref={textareaRef}
				id="extendify-agent-chat-textarea"
				disabled={inputDisabled}
				className={classNames(
					'flex max-h-[calc(75dvh)] min-h-16 w-full resize-none overflow-y-auto bg-transparent px-2 pb-4 pt-2.5 text-base placeholder:text-gray-700 focus:shadow-none focus:outline-hidden disabled:opacity-50 md:text-sm border-none text-gray-900',
				)}
				placeholder={placeholderFor({ disabled, editing, block })}
				rows="1"
				// biome-ignore lint: Allow autofocus here
				autoFocus
				value={input}
				onChange={(e) => {
					setInput(e.target.value);
					setHistoryIndex(null);
					adjustHeight();
				}}
				onKeyDown={handleKeyDown}
				onFocus={stagePinnedSelection}
			/>
			<div className="flex justify-between gap-4 px-2 pb-2">
				<div className="ms-auto flex items-center gap-1">
					<span
						className={classNames(
							'text-xs font-medium',
							overLimit ? 'text-red-600' : 'invisible',
						)}
						role="alert"
					>
						{overLimit && __('Message too long', 'extendify-local')}
					</span>
					<SubmitButton
						disabled={inputDisabled}
						noInput={input.trim().length === 0}
						overLimit={overLimit}
						showCancel={busy}
						handleCancel={handleCancel}
					/>
				</div>
			</div>
		</form>
	);
};

const SubmitButton = ({
	disabled,
	noInput,
	overLimit,
	showCancel,
	handleCancel,
}) =>
	showCancel ? (
		<button
			type="button"
			onClick={handleCancel}
			className="inline-flex h-7 w-7 items-center justify-center rounded-full border-0 bg-design-main p-0 text-white transition-colors focus-visible:ring-design-main disabled:opacity-20"
		>
			<Icon fill="currentColor" icon={cancelRequest} size={14} />
			<span className="sr-only">{__('Cancel', 'extendify-local')}</span>
		</button>
	) : (
		<button
			type="submit"
			className="inline-flex h-7 w-7 items-center justify-center rounded-full border-0 bg-design-main p-0 text-white transition-colors focus-visible:ring-design-main disabled:opacity-20"
			disabled={disabled || noInput || overLimit}
		>
			<Icon fill="currentColor" icon={arrowUp} size={20} />
			<span className="sr-only">{__('Send message', 'extendify-local')}</span>
		</button>
	);
