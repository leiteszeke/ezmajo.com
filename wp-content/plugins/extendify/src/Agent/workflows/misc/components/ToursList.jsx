import { useTourStore } from '@agent/state/tours';
import tours from '@agent/tours/tours';
import { Icon, video } from '@wordpress/icons';

const availableTours = Object.values(tours);

export const ToursList = ({ onConfirm }) => {
	if (availableTours.length === 0) return;

	return (
		<div className="flex w-full items-start gap-2.5 px-2.5 py-2">
			<div className="w-7 flex-shrink-0" />
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				{availableTours.map((tour) => (
					<SingleTour
						key={tour.id}
						tour={tour}
						onClick={() => {
							onConfirm?.();
						}}
					/>
				))}
			</div>
		</div>
	);
};

export const SingleTour = ({ tour, onClick }) => {
	const { startTour } = useTourStore();
	return (
		<div className="group relative flex items-center">
			<div className="pointer-events-none absolute inset-0 rounded-sm opacity-10 transition-opacity duration-100 group-hover:bg-design-main" />
			<button
				type="button"
				className="flex w-full items-center gap-2 rounded-sm border border-gray-300 bg-transparent p-3 text-left text-sm leading-none text-gray-900 focus:outline-hidden focus:ring-wp focus:ring-design-main group-hover:ring-wp group-hover:ring-design-main"
				onClick={() => {
					startTour(tour);
					onClick?.();
				}}
			>
				<Icon icon={video} className="h-6 w-6 fill-gray-700 leading-none" />
				{tour.message}
			</button>
		</div>
	);
};
