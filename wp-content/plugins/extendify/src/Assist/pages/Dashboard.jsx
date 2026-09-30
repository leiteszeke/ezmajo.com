import { DesktopCards } from '@assist/components/dashboard/DesktopCards';
import { DomainBanner } from '@assist/components/dashboard/domains/DomainBanner';
import { SecondaryDomainBanner } from '@assist/components/dashboard/domains/SecondaryDomainBanner';
import { MobileCards } from '@assist/components/dashboard/MobileCards';
import { QuickLinks } from '@assist/components/dashboard/QuickLinks';
import { Recommendations } from '@assist/components/dashboard/Recommendations';
import { useTasks } from '@assist/hooks/useTasks';
import {
	showDomainBanner,
	showSecondaryDomainBanner,
} from '@assist/lib/domains';
import { Full } from '@assist/pages/layouts/Full';
import { useGlobalStore } from '@assist/state/globals';
import { useTasksStore } from '@assist/state/tasks';
import { Notification } from '@notifications/Notification';

export const Dashboard = () => {
	const { tasks } = useTasks();
	const { isDismissedBanner } = useGlobalStore();
	const { isCompleted } = useTasksStore();
	const totalCompleted = tasks.filter((task) => isCompleted(task.slug)).length;

	return (
		<Full>
			{showDomainBanner && !isDismissedBanner('domain-banner') && (
				<DomainBanner />
			)}

			{showSecondaryDomainBanner &&
				!isDismissedBanner('secondary-domain-banner') && (
					<SecondaryDomainBanner />
				)}

			<div className="mb-6">
				<Notification slot="admin-assist" />
			</div>

			<DesktopCards
				className="hidden md:block"
				tasks={tasks}
				totalCompleted={totalCompleted}
			/>

			<MobileCards
				className="md:hidden"
				tasks={tasks}
				totalCompleted={totalCompleted}
			/>

			<div className="mb-6 gap-4 md:grid">
				<QuickLinks className="col-span-2" />
			</div>

			<Recommendations />
		</Full>
	);
};
