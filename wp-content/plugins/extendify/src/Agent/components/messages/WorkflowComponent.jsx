import { ErrorMessage } from '@agent/components/ErrorMessage';
import { workflows } from '@agent/workflows/workflows';
import { __ } from '@wordpress/i18n';

export const WorkflowComponent = ({ message }) => {
	const Component = workflows.find((w) => w.id === message.details.id)
		?.whenFinished?.component;

	if (!Component) return <ErrorM />;
	return <Component {...message.details} />;
};

const ErrorM = () => (
	<ErrorMessage>
		<div className="text-sm">
			<div className="font-semibold">
				{__('Component not available', 'extendify-local')}
			</div>
			<div className="">
				{
					// translators: This is for when a component doesn't exist
					__(
						'It may have been removed or is not available for your account.',
						'extendify-local',
					)
				}
			</div>
		</div>
	</ErrorMessage>
);
