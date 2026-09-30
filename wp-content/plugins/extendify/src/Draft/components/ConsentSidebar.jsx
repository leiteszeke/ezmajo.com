import { useAIConsentStore } from '@shared/state/ai-consent';
import { Panel } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export const ConsentSidebar = () => {
	const { consentTerms, setUserGaveConsent } = useAIConsentStore();

	return (
		<Panel>
			<div className="p-4">
				<h2 className="mb-2 mt-0 text-lg">
					{__('Terms of Use', 'extendify-local')}
				</h2>
				<p className="m-0" dangerouslySetInnerHTML={{ __html: consentTerms }} />
				<button
					className="mt-4 w-full rounded-sm border-0 bg-wp-theme-main px-4 py-2 text-center text-white"
					type="button"
					onClick={() => setUserGaveConsent(true)}
					data-test="draft-terms-button"
				>
					{__('Accept', 'extendify-local')}
				</button>
			</div>
		</Panel>
	);
};
