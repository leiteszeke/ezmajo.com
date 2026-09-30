import { DynamicTextarea } from '@draft/components/DynamicTextarea';
import { useSelectedText } from '@draft/hooks/useSelectedText';
import { magic } from '@draft/svg';
import { Spinner } from '@wordpress/components';
import { __, isRTL } from '@wordpress/i18n';
import { arrowLeft, arrowRight, Icon } from '@wordpress/icons';
import classnames from 'classnames';

export const Input = ({
	inputText,
	setInputText,
	ready,
	setReady,
	setPrompt,
	loading,
}) => {
	const { selectedText } = useSelectedText();

	const submit = (event) => {
		event.preventDefault();

		if (!ready || loading) return;

		setInputText('');
		setReady(false);

		setPrompt({
			text: selectedText ? selectedText : inputText,
			promptType: selectedText ? 'custom-requests' : 'create',
			systemMessageKey: selectedText ? 'edit' : 'generate',
			// The prompt as a followup to the user's input
			details: { followup: selectedText ? inputText : undefined },
		});
	};

	return (
		<form className="relative flex items-start" onSubmit={submit}>
			<Icon
				icon={magic}
				className="absolute left-2 top-3.5 h-5 w-5 fill-current text-wp-theme-main rtl:left-auto rtl:right-2"
			/>
			<DynamicTextarea
				disabled={loading}
				placeholder={
					loading
						? __('AI is writing...', 'extendify-local')
						: selectedText
							? __('Ask AI to edit', 'extendify-local')
							: __('Ask AI to generate text', 'extendify-local')
				}
				value={inputText}
				className="h-full w-full resize-none overflow-hidden rounded-none border-transparent bg-transparent px-10 py-3 outline-hidden focus:ring-1 focus:ring-wp-theme-main"
				onChange={(event) => {
					setInputText(event.target.value);
					setReady(event.target.value.length > 0);
				}}
				onKeyDown={(event) => {
					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault();
						submit(event);
					}
				}}
			/>
			{loading && (
				<div className="absolute right-4 top-3.5 h-4 w-4 p-1 text-gray-700 rtl:left-4 rtl:right-auto">
					<Spinner style={{ margin: '0' }} />
				</div>
			)}
			{!loading && (
				<button
					type="submit"
					disabled={!ready}
					aria-label={__('Submit', 'extendify-local')}
					className={classnames(
						'absolute right-2 top-3.5 border-none bg-transparent p-0 rtl:left-2 rtl:right-auto',
						{
							'text-gray-700 hover:text-design-main': ready,
							'text-gray-500': !ready,
						},
					)}
				>
					<Icon
						icon={isRTL() ? arrowLeft : arrowRight}
						onClick={submit}
						className="h-6 w-6 fill-current"
					/>
				</button>
			)}
		</form>
	);
};
