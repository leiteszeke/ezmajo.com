import { domainOffer } from '@agent/lib/domain-suggestion';
import { useDomainActivities } from '@agent/state/domain-activities';
import { __ } from '@wordpress/i18n';

const record = ({ tracking }, action) =>
	useDomainActivities.getState().setDomainActivity({ ...tracking, action });

export default {
	id: 'register-domain',
	follows: '*',
	statuses: ['completed', 'canceled'],
	data: domainOffer,
	// Under 0.1 so a taken card scoring 1 or more still wins.
	score: ({ data }) => (data ? 0.05 : 0),
	content: ({ message, url }) => ({
		title: message,
		// translators: Body of a card in the AI Agent chat that offers to register a domain name for the website.
		body: __(
			'Your own domain makes your site easier to find and remember.',
			'extendify-local',
		),
		action: {
			// translators: Button on a card in the AI Agent chat that opens a domain registrar in a new tab.
			label: __('Register this domain', 'extendify-local'),
			url,
		},
	}),
	onView: (data) => record(data, 'viewed'),
	onClick: (data) => record(data, 'clicked'),
};
