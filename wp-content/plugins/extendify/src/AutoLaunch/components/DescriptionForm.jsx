import { WaitingOverlay } from '@auto-launch/components/Waiting';
import { ActionButton, SecondaryButton } from '@auto-launch/templates/button';
import { forwardRef } from '@wordpress/element';
import { pencil } from '@wordpress/icons';
import classNames from 'classnames';

export const DescriptionForm = ({
	showTitle,
	title,
	onTitleChange,
	description,
	onDescriptionChange,
	descriptionRef,
	placeholder,
	submitLabel,
	submitDisabled,
	onSubmit,
	showEnhance,
	enhanceDisabled,
	onEnhance,
	consentTerms,
	waiting,
	waitingMessage,
	strings,
	autoFocus = true,
}) => (
	<>
		{/* biome-ignore lint: allow onClick without keyboard */}
		<form
			onSubmit={onSubmit}
			onClick={() => descriptionRef?.current?.focus()}
			className="relative flex w-full flex-col gap-ui-section"
			aria-busy={waiting}
		>
			<WaitingOverlay show={waiting} message={waitingMessage} />
			{showTitle && (
				<TitleField
					autoFocus={autoFocus}
					value={title}
					onChange={onTitleChange}
					label={strings.titleLabel}
					placeholder={strings.titlePlaceholder}
				/>
			)}
			<div className="flex w-full flex-col">
				{showTitle && <DescriptionLabel label={strings.descriptionLabel} />}
				<div className="w-full rounded-ui-card border-ui border-ui-line bg-ui-surface text-ui-ink backdrop-blur-ui focus-within:border-ui-focus focus-within:ring-ui-focus shadow-ui overflow-hidden">
					<DescriptionField
						ref={descriptionRef}
						value={description}
						onChange={onDescriptionChange}
						placeholder={placeholder}
						autoFocus={autoFocus && !showTitle}
					/>
					<div
						className={classNames('flex items-end gap-ui p-ui', {
							'justify-between': showEnhance,
							'justify-end': !showEnhance,
						})}
					>
						{showEnhance && (
							<EnhanceButton
								disabled={enhanceDisabled}
								onClick={onEnhance}
								label={strings.enhance}
							/>
						)}
						<ActionButton
							type="submit"
							label={submitLabel}
							disabled={submitDisabled}
						/>
					</div>
				</div>
			</div>
		</form>
		<ConsentNotice terms={consentTerms} />
	</>
);

export const TitleField = ({
	value,
	onChange,
	autoFocus,
	label,
	placeholder,
}) => (
	<div className="w-full">
		<label
			htmlFor="extendify-launch-site-title"
			className="mb-ui-label block px-2 text-ui-body font-medium leading-ui text-ui-page-text"
		>
			{label}
		</label>
		<div className="w-full rounded-ui-input border-ui border-ui-line bg-ui-surface text-ui-ink backdrop-blur-ui focus-within:border-ui-focus focus-within:ring-ui-focus shadow-ui overflow-hidden">
			<input
				id="extendify-launch-site-title"
				type="text"
				className="w-full bg-transparent text-ui-body font-medium leading-ui font-ui-input placeholder:text-ui-ink-muted placeholder:font-normal focus:shadow-none focus:outline-hidden border-none text-ui-ink px-ui py-4"
				// biome-ignore lint: Allow autofocus here
				autoFocus={autoFocus}
				autoComplete="off"
				data-1p-ignore
				value={value}
				// the form's onClick refocuses the textarea; keep clicks here local
				onClick={(e) => e.stopPropagation()}
				onChange={(e) => onChange?.(e.target.value)}
				placeholder={placeholder}
			/>
		</div>
	</div>
);

export const DescriptionLabel = ({ label }) => (
	<label
		htmlFor="extendify-launch-chat-textarea"
		className="mb-ui-label block px-2 text-ui-body font-medium leading-ui text-ui-page-text"
	>
		{label}
	</label>
);

export const DescriptionField = forwardRef(
	({ value, onChange, placeholder, autoFocus }, ref) => (
		<textarea
			ref={ref}
			id="extendify-launch-chat-textarea"
			className="flex min-h-40 md:min-h-24 w-full resize-none bg-transparent text-ui-body leading-ui font-ui-input placeholder:text-ui-ink-muted focus:shadow-none focus:outline-hidden border-none text-ui-ink p-ui pb-0"
			rows="1"
			// biome-ignore lint: Allow autofocus here
			autoFocus={autoFocus}
			autoComplete="off"
			data-1p-ignore
			value={value}
			onChange={(e) => onChange?.(e.target.value)}
			placeholder={placeholder}
		/>
	),
);

export const EnhanceButton = ({ disabled, onClick, label }) => (
	<SecondaryButton
		icon={pencil}
		label={label}
		disabled={disabled}
		onClick={onClick}
	/>
);

export const ConsentNotice = ({ terms }) => (
	<div
		className="text-pretty text-center leading-4 opacity-70 text-ui-page-text [&>a]:text-ui-page-text [&>a]:underline w-full [margin-block-start:var(--ext-ui-consent-gap,16px)] [font-size:var(--ext-ui-consent-size,12px)] [&>a]:[font-size:var(--ext-ui-consent-size,12px)]"
		dangerouslySetInnerHTML={{ __html: terms }}
	/>
);
