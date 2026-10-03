import { StatusScribble } from '@agent/components/messages/StatusIndicator';
import { __ } from '@wordpress/i18n';

export const SavingState = ({ label }) => (
	<output className="mb-2 ms-2 me-2 flex items-center gap-1.5 px-1 text-sm italic text-gray-700">
		<StatusScribble />
		<span className="status-animation">
			{label || __('Saving...', 'extendify-local')}
		</span>
	</output>
);
