import { domainSearchUrl } from '@assist/lib/domains';
import { useDomainActivities } from '@assist/state/domain-activities';
import { useEffect } from 'react';

export const useDomainViewActivity = ({ position, items }) => {
	const { setDomainActivity } = useDomainActivities();

	useEffect(() => {
		if (!domainSearchUrl || !items.length) return;
		items.forEach(({ domain, type }) => {
			setDomainActivity({ domain, position, type, action: 'viewed' });
		});
	}, [setDomainActivity, position, items]);
};
