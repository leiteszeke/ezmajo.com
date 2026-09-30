import { useTasksStore } from '@assist/state/tasks';

export const DemoCard = ({ task }) => {
	const { completeTask, isCompleted } = useTasksStore();
	return (
		<div
			className="flex h-full w-full bg-cover bg-right-bottom bg-no-repeat"
			style={{
				backgroundImage: `url(${task?.backgroundImage})`,
			}}
		>
			<div className="flex h-full w-full grow flex-col bg-black/10 px-8 py-8 text-white lg:mr-20 lg:bg-transparent">
				<div className="title text-2xl font-semibold md:mt-32 md:text-4xl md:leading-10">
					{task.title}
				</div>
				<div className="description mt-2 text-sm md:text-base lg:mr-16">
					{task.description}
				</div>
				<div className="cta mt-8 flex flex-wrap items-center text-sm md:gap-3">
					<a
						target="_blank"
						className="min-w-24 cursor-pointer rounded-xs bg-design-main px-4 py-2.5 text-center text-sm font-medium text-design-text no-underline hover:opacity-90 md:block"
						href={task.link}
						onClick={() => completeTask(task.slug)}
					>
						{isCompleted(task.slug)
							? task.buttonLabels.completed
							: task.buttonLabels.notCompleted}
					</a>
				</div>
			</div>
		</div>
	);
};
