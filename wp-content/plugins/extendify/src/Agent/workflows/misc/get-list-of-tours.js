import { ToursList } from '@agent/workflows/misc/components/ToursList';

export default {
	available: () => true,
	id: 'list-tours',
	whenFinished: { component: ToursList },
};
