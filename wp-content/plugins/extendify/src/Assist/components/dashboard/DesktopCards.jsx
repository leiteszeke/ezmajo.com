import { CardContent } from '@assist/components/dashboard/CardContent';
import { CardsTitle } from '@assist/components/dashboard/CardsTitle';
import { useTours } from '@assist/hooks/useTours';
import { useTasksStore } from '@assist/state/tasks';
import { Bullet, Check } from '@assist/svg';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import {
	forwardRef,
	useCallback,
	useEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { Icon } from '@wordpress/icons';
import classNames from 'classnames';

export const DesktopCards = ({ className, tasks, totalCompleted }) => {
	const { isCompleted } = useTasksStore();
	const { finishedTour } = useTours();
	const [nextTask, setNextTask] = useState(-1);
	const tabRefs = useRef([]);

	const findNextTask = useCallback(
		(currentIndex = 0) => {
			// Re sort based on current index
			const sortedTasks = tasks
				.slice(currentIndex)
				.concat(tasks.slice(0, currentIndex));
			const next = sortedTasks.findIndex(({ slug }) => !isCompleted(slug));
			// Find the index of the next incomplete task from the original list
			return tasks.findIndex(({ slug }) => slug === sortedTasks?.[next]?.slug);
		},
		[tasks, isCompleted],
	);

	useEffect(() => {
		if (totalCompleted === tasks.length || totalCompleted === 0) return;
		setNextTask((prev) => findNextTask(prev + 1));
	}, [tasks?.length, totalCompleted, findNextTask]);

	useEffect(() => {
		tabRefs.current?.[nextTask]?.scrollIntoView({
			behavior: 'smooth',
			block: 'nearest',
			inline: 'start',
		});
	}, [nextTask]);

	return (
		<div
			data-test="assist-tasks-module"
			id="assist-tasks-module"
			className={classNames(
				className,
				'mb-6 h-full w-full rounded-sm border border-gray-300 bg-white text-base',
			)}
		>
			{tasks && (
				<TabGroup
					defaultIndex={nextTask}
					selectedIndex={nextTask}
					onChange={setNextTask}
					vertical
					as="div"
					className="flex h-[472px] min-h-96 grow flex-row-reverse justify-between rtl:flex-row"
				>
					<TabList
						as="div"
						className="w-96 overflow-auto border-l border-gray-100"
					>
						<CardsTitle totalCompleted={totalCompleted} total={tasks.length} />

						{tasks.map((task, index) => (
							<TabItem
								key={task.slug}
								ref={(el) => {
									tabRefs.current[index] = el;
								}}
								task={task}
								isCompleted={
									task.type === 'tour'
										? finishedTour(task.slug) || isCompleted(task.slug)
										: isCompleted(task.slug)
								}
							/>
						))}
					</TabList>

					<TabPanels as="div" className="w-3/4">
						{tasks.map((task) => (
							<TabPanel
								key={task.slug}
								as="div"
								data-test="assist-task-card-wrapper"
								className="h-full"
							>
								<CardContent task={task} />
							</TabPanel>
						))}
					</TabPanels>
				</TabGroup>
			)}
		</div>
	);
};

const TabItem = forwardRef(({ task, isCompleted }, ref) => (
	<Tab as="div" data-test={`assist-task-${task.slug}`}>
		{({ selected }) => (
			<div
				ref={ref}
				className={classNames(
					'group flex w-full items-center justify-between border-b border-gray-300 py-4 pl-2 pr-4 text-sm hover:cursor-pointer hover:bg-gray-100',
					{
						'bg-gray-100 font-semibold': selected,
					},
				)}
			>
				<div className="flex w-full items-center">
					<Icon
						icon={isCompleted ? Check : Bullet}
						size={12}
						data-test={
							isCompleted ? 'completed-task-icon' : 'uncompleted-task-icon'
						}
						className={classNames('mx-2 flex-shrink-0', {
							'stroke-current text-design-main':
								(isCompleted && selected) || (isCompleted && !selected),
							'fill-current text-design-main': selected && !isCompleted,
							'text-center text-gray-400': !isCompleted && !selected,
						})}
					/>
					<span>{task?.sidebarTitle ?? task.title}</span>
				</div>
			</div>
		)}
	</Tab>
));
