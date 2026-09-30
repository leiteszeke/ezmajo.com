import { ActionButton } from '@assist/components/dashboard/buttons/ActionButton';
import { DismissButton } from '@assist/components/dashboard/buttons/DismissButton';
import { DemoCard } from '@assist/components/dashboard/cards/DemoCard';
import { GenericCard } from '@assist/components/dashboard/cards/GenericCard';
import { NoActionBtnCard } from '@assist/components/dashboard/cards/NoActionBtnCard';
import { DomainCard } from '@assist/components/dashboard/domains/DomainCard';
import { SecondaryDomainCard } from '@assist/components/dashboard/domains/SecondaryDomainCard';
import { LaunchCard } from '@assist/components/dashboard/LaunchCard';
import { useTours } from '@assist/hooks/useTours';
import { useTasksStore } from '@assist/state/tasks';
import { useRef } from '@wordpress/element';

export const CardContent = ({ task }) => {
	if (task.type === 'html-text-button') return <GenericCard task={task} />;

	if (task.type === 'domain-task') return <DomainCard task={task} />;

	if (task.type === 'secondary-domain-task')
		return <SecondaryDomainCard task={task} />;

	if (task.type === 'site-launcher-task') return <LaunchCard task={task} />;

	if (task.type === 'demo-card') return <DemoCard task={task} />;
	if (task.type === 'no-action-btn-card')
		return <NoActionBtnCard task={task} />;

	return <TaskContent task={task} />;
};

const TaskContent = ({ task }) => {
	const { isCompleted, dismissTask } = useTasksStore();
	const { finishedTour } = useTours();
	const isCompletedTask = isCompleted(task.slug) || finishedTour(task.slug);
	// lock state on internal Link buttons if task is not completed
	const lockedState = useRef(
		task.type === 'internalLink' && !isCompletedTask ? task : null,
	);
	const handleDismiss = () => {
		lockedState.current = null;
		dismissTask(task.slug);
	};
	return (
		<div
			className="flex h-full w-full bg-cover bg-right-bottom bg-no-repeat"
			style={{
				backgroundImage: `url(${task?.backgroundImage})`,
			}}
		>
			<div className="flex h-full w-full grow flex-col bg-white/95 px-8 py-8 lg:mr-48 lg:bg-transparent">
				<div className="title text-2xl font-semibold leading-10 md:mt-32 lg:text-3xl">
					{task.title}
				</div>
				<div className="description mt-2 text-sm md:text-base">
					{task.description}
				</div>

				<div className="cta mt-8 flex flex-wrap items-center text-sm md:gap-3 rtl:justify-end">
					<ActionButton task={lockedState.current ?? task} />
					{lockedState.current || !isCompletedTask ? (
						<DismissButton task={task} onClick={handleDismiss} />
					) : null}
				</div>
			</div>
		</div>
	);
};
