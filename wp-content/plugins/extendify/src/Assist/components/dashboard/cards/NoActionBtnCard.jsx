import { DismissButton } from '@assist/components/dashboard/buttons/DismissButton';
import { useTasksStore } from '@assist/state/tasks';

export const NoActionBtnCard = ({ task }) => {
	const { isCompleted, dismissTask } = useTasksStore();
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

				{!isCompleted(task.slug) && (
					<div className="mt-8 flex-wrap text-sm">
						<DismissButton
							task={task}
							variant="no-x-spacing"
							onClick={() => dismissTask(task.slug)}
						/>
					</div>
				)}
			</div>
		</div>
	);
};
