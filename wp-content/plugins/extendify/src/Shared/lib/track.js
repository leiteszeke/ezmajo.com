import { INSIGHTS_HOST } from '@constants';
import { reqDataBasics } from '@shared/lib/data';

const HEADERS = {
	'Content-type': 'application/json',
	Accept: 'application/json',
	'X-Extendify': 'true',
};

const ENDPOINT = `${INSIGHTS_HOST}/api/v1/event`;

export const track = (key, payload = {}) => {
	if (!INSIGHTS_HOST || !key) return;
	const { siteId, partnerId, homeUrl, siteCreatedAt } = reqDataBasics;
	try {
		fetch(ENDPOINT, {
			method: 'POST',
			headers: HEADERS,
			keepalive: true,
			body: JSON.stringify({
				insightsId: siteId,
				key,
				payload,
				partnerId,
				siteURL: homeUrl,
				siteCreatedAt,
			}),
		}).catch(() => {
			/* swallow */
		});
	} catch (_e) {
		/* swallow */
	}
};
