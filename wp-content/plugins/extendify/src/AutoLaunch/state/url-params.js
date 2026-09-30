import { safeParseJson } from '@shared/lib/parsing';
import { z } from 'zod';

// These override user/ai counterparts in get-profile
export const urlParamsShape = z.object({
	title: z
		.string()
		.optional()
		.default('')
		.catch(() => ''),
	description: z
		.string()
		.optional()
		.default('')
		.catch(() => ''),
	type: z
		.string()
		.optional()
		.catch(() => ''),
	objective: z
		.string()
		.optional()
		.catch(() => ''),
	category: z
		.string()
		.optional()
		.catch(() => ''),
	structure: z
		.string()
		.optional()
		.catch(() => ''),
	tone: z
		.array(z.string())
		.optional()
		.catch(() => []),
	products: z
		.union([z.string(), z.literal(false)])
		.optional()
		.catch(() => false),
	appointments: z
		.boolean()
		.optional()
		.catch(() => false),
	events: z
		.boolean()
		.optional()
		.catch(() => false),
	donations: z
		.boolean()
		.optional()
		.catch(() => false),
	multilingual: z
		.boolean()
		.optional()
		.catch(() => false),
	contact: z
		.boolean()
		.optional()
		.catch(() => false),
	address: z
		.union([z.boolean(), z.string()])
		.optional()
		.catch(() => false),
	blog: z
		.boolean()
		.optional()
		.catch(() => false),
	'landing-page': z
		.string()
		.optional()
		.catch(() => ''),
	'cta-link': z
		.union([z.boolean(), z.string()])
		.optional()
		.catch(() => false),
	'build-id': z
		.string()
		.optional()
		.catch(() => ''),
	go: z
		.boolean()
		.optional()
		.catch(() => false),
});

export const urlParams = urlParamsShape.parse(
	safeParseJson(window.extLaunchData?.urlParams) || {},
);
// remove them from the url to avoid confusion later
const url = new URL(window.location.href);
Object.keys(urlParams).forEach((key) => {
	url.searchParams.delete(key);
});
window.history.replaceState({}, '', url.toString());

export const overrideWithUrlParams = (urlParams) => {
	const {
		'landing-page': landingPage,
		'cta-link': landingPageCTALink,
		...rest
	} = urlParams;
	const mapped = {
		...rest,
		landingPage: landingPage === 'clickthrough' || undefined,
		landingPageCTALink,
	};

	return Object.fromEntries(
		Object.entries(mapped).filter(([, v]) => v !== undefined && v !== ''),
	);
};
