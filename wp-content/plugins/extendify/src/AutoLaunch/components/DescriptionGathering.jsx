import { DescriptionForm } from '@auto-launch/components/DescriptionForm';
import { useDescriptionForm } from '@auto-launch/hooks/useDescriptionForm';

export const DescriptionGathering = ({ autoFocus }) => (
	<DescriptionForm {...useDescriptionForm()} autoFocus={autoFocus} />
);
