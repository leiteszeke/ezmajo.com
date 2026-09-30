import { ActionButton } from '@assist/components/dashboard/buttons/ActionButton';
import { DismissButton } from '@assist/components/dashboard/buttons/DismissButton';
import { useTasksStore } from '@assist/state/tasks';

export const GenericCard = ({ task }) => {
	const { isCompleted, dismissTask } = useTasksStore();

	return (
		<div className="h-full justify-center overflow-hidden bg-white/95 text-base">
			<div className="flex h-full flex-col items-center justify-center gap-5 p-7 text-center md:p-8">
				{task?.htmlBefore()}

				<div className="flex h-full flex-col items-center justify-center text-center lg:justify-between">
					<div>
						{task?.title && (
							<h2 className="mb-2 text-2xl font-semibold leading-10 md:mt-0 lg:text-2xl">
								{task.title}
							</h2>
						)}
						{task?.description && (
							<p className="m-0 text-sm md:text-base">{task.description}</p>
						)}
					</div>
					<div className="cta mt-6 flex flex-wrap items-center text-sm md:gap-3 lg:mt-3">
						<ActionButton task={task} />
						{!isCompleted(task.slug) ? (
							<DismissButton
								task={task}
								onClick={() => dismissTask(task.slug)}
							/>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
};
