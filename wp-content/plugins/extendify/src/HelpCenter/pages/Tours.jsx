import {
	playIcon,
	restartIcon,
	toursIcon,
} from '@help-center/components/tours/icons';
import { useGlobalSyncStore } from '@help-center/state/globals-sync';
import { useTourStore } from '@help-center/state/tours';
import tours from '@help-center/tours/tours';
import { __, isRTL } from '@wordpress/i18n';
import { chevronLeft, chevronRight, Icon } from '@wordpress/icons';
import classNames from 'classnames';

export const ToursDashboard = ({ onOpen, classes }) => {
	const { startTour } = useTourStore();
	const { setVisibility } = useGlobalSyncStore();
	const availableTours = Object.values(tours).filter(
		(tour) =>
			tour.settings.startFrom.includes(window.location.href) ||
			!tour.settings.startFrom,
	);
	return (
		<section className={classes} data-test="help-center-tours-section">
			<button
				data-test="help-center-tours-open-button"
				type="button"
				onClick={onOpen}
				className={classNames(
					'm-0 flex w-full justify-between gap-2 rounded-md border border-gray-200 bg-transparent p-2.5 text-left hover:bg-gray-100 rtl:text-right',
					{
						'rounded-b-none': availableTours.length > 0,
					},
				)}
			>
				<Icon
					icon={toursIcon}
					className="rounded-full border-0 bg-design-main fill-design-text p-2"
					size={48}
				/>
				<div className="grow pl-1">
					<h1 className="m-0 p-0 text-lg font-medium">
						{__('Tours', 'extendify-local')}
					</h1>
					<p className="m-0 p-0 text-xs text-gray-800">
						{__('Learn more about your WordPress admin', 'extendify-local')}
					</p>
				</div>
				<div className="flex h-12 grow-0 items-center justify-between">
					<Icon
						icon={isRTL() ? chevronLeft : chevronRight}
						size={24}
						className="fill-current text-gray-700"
					/>
				</div>
			</button>
			{availableTours.length > 0 && (
				<button
					data-extendify-tour-id={availableTours[0].id}
					type="button"
					className="text-base m-0 flex w-full items-center justify-between gap-2 rounded-md rounded-t-none border border-t-0 border-gray-200 bg-transparent p-3 px-4 pl-[4.25rem] text-left font-medium text-gray-900 hover:bg-gray-100 rtl:pl-4 rtl:pr-[4.25rem] rtl:text-right"
					onClick={() => {
						setVisibility('minimized');
						startTour(availableTours[0]);
					}}
				>
					{__('Tour this page', 'extendify-local')}
					<Icon
						icon={playIcon}
						size={16}
						className={isRTL() ? 'rotate-180' : ''}
					/>
				</button>
			)}
		</section>
	);
};

export const Tours = () => {
	const { wasCompleted, startTour } = useTourStore();
	const { setVisibility } = useGlobalSyncStore();
	return (
		<section className="p-4">
			<ul
				className="m-0 flex flex-col gap-2 p-0"
				data-test="help-center-tours-items-list"
			>
				{Object.values(tours).map((tourData) => {
					const { id, title } = tourData;
					return (
						<li key={id} className="m-0 p-0" data-extendify-tour-id={id}>
							<button
								type="button"
								className="m-0 flex w-full items-center justify-between gap-2 bg-gray-100 px-4 py-3.5 text-sm font-medium text-gray-900 hover:bg-gray-150"
								onClick={() => {
									setVisibility('minimized');
									startTour(tourData);
								}}
							>
								{title}
								{wasCompleted(id) ? (
									<Icon
										data-test="restart-tour-icon"
										icon={restartIcon}
										size={16}
									/>
								) : (
									<Icon
										data-test="play-tour-icon"
										icon={playIcon}
										className={isRTL() ? 'rotate-180' : ''}
										size={16}
									/>
								)}
							</button>
						</li>
					);
				})}
			</ul>
		</section>
	);
};

export const routes = [
	{
		slug: 'tours',
		title: __('Tours', 'extendify-local'),
		component: Tours,
	},
];
