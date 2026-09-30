import { __ } from '@wordpress/i18n';

export const TourButton = ({ task, completed }) => {
	const startTour = (slug) =>
		window.dispatchEvent(
			new CustomEvent('extendify-assist:start-tour', {
				detail: { tourSlug: slug },
			}),
		);

	return (
		<div className="">
			<button
				type="button"
				className="hidden min-w-24 rounded-xs bg-design-main px-4 py-2.5 text-sm font-medium text-design-text hover:opacity-90 md:block"
				onClick={() => startTour(task.slug)}
			>
				{completed
					? task.buttonLabels.completed
					: task.buttonLabels.notCompleted}
			</button>
			<div className="rounded-xs border bg-gray-100 px-2 py-2 text-gray-700 sm:block md:hidden">
				{__(
					'This tour is only available on desktop devices',
					'extendify-local',
				)}
			</div>
		</div>
	);
};
