import { CardContent } from '@assist/components/dashboard/CardContent';
import { CardsTitle } from '@assist/components/dashboard/CardsTitle';
import { useTasksStore } from '@assist/state/tasks';
import { Bullet } from '@assist/svg';
import { Disclosure } from '@headlessui/react';
import { check, chevronUp, Icon } from '@wordpress/icons';
import classNames from 'classnames';

export const MobileCards = ({ className, totalCompleted, tasks }) => {
	const { isCompleted } = useTasksStore();

	return (
		<div
			className={classNames(
				className,
				'mb-6 h-full w-full overflow-auto rounded-sm border border-gray-300 bg-white',
			)}
		>
			<CardsTitle totalCompleted={totalCompleted} total={tasks.length} />

			{tasks.map((task) => {
				const isCompletedTask = isCompleted(task.slug);
				return (
					<Disclosure key={task.slug}>
						{({ open }) => (
							<>
								<Disclosure.Button
									as="div"
									className={classNames(
										'flex w-full items-center border-b text-base',
										{
											'border-transparent font-semibold': open,
											'border-gray-400': !open,
										},
									)}
								>
									<div className="group flex w-full items-center justify-between px-5 py-4 hover:cursor-pointer hover:bg-gray-100 md:border md:border-gray-100 lg:px-6">
										<div className="flex w-full items-center space-x-2">
											<Icon
												icon={isCompletedTask ? check : Bullet}
												size={isCompletedTask ? 24 : 12}
												className={classNames('flex-shrink-0', {
													'fill-current text-design-main': open,
													'mx-2 text-center text-gray-400':
														!isCompletedTask && !open,
													'mx-2': !isCompletedTask && open,
												})}
											/>
											{task?.sidebarTitle ?? task.title}
										</div>
										<div className="md:hidden">
											<Icon
												icon={chevronUp}
												className={classNames(
													'h-5 w-5 text-purple-500 md:hidden',
													{
														'rotate-180 transform': open,
													},
												)}
											/>
										</div>
									</div>
								</Disclosure.Button>

								<Disclosure.Panel className="border-b border-gray-400">
									<CardContent task={task} />
								</Disclosure.Panel>
							</>
						)}
					</Disclosure>
				);
			})}
		</div>
	);
};
