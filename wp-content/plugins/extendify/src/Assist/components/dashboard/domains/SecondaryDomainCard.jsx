import { useDomainViewActivity } from '@assist/hooks/useDomainViewActivity';
import {
	buildDomainViewItems,
	createDomainUrlLink,
	deleteDomainCache,
	domainSearchUrl,
	domains,
} from '@assist/lib/domains';
import { useDomainActivities } from '@assist/state/domain-activities';
import { useTasksStore } from '@assist/state/tasks';
import { __ } from '@wordpress/i18n';
import { chevronRightSmall, Icon } from '@wordpress/icons';

const viewItems = buildDomainViewItems(domains);

export const SecondaryDomainCard = ({ task }) => {
	const { completeTask } = useTasksStore();
	const { setDomainActivity } = useDomainActivities();
	useDomainViewActivity({ position: 'addon-task', items: viewItems });

	const handleInteract = () => {
		completeTask(task.slug);
		deleteDomainCache();
	};

	const recordActivity = (domain, type) =>
		setDomainActivity({ domain, position: 'addon-task', type });

	if (!domains.length) {
		return (
			<div
				className="flex h-full w-full items-center justify-center bg-cover bg-right-bottom bg-no-repeat"
				style={{
					backgroundImage: `url(${task.backgroundImage}})`,
				}}
			>
				{__('Service offline. Check back later.', 'extendify-local')}
			</div>
		);
	}

	if (!domainSearchUrl) return null;

	return (
		<div
			className="flex h-full w-full bg-cover bg-right-bottom bg-no-repeat"
			data-test="assist-domain-card-secondary-domain-module"
			style={{
				backgroundImage: `url(${task.backgroundImage})`,
			}}
		>
			<div className="flex w-full flex-col px-8 py-12 md:pl-8 md:pr-0 lg:mr-24">
				<div className="title text-2xl font-semibold md:text-4xl">
					{task.innerTitle}
				</div>
				<div className="description mb-8 mt-2 text-base">
					{task.description}
				</div>
				<div className="overflow-auto rounded-sm bg-gray-100 md:w-full">
					<div className="rounded-tl rounded-tr border-b border-gray-200 px-6 py-4 md:flex md:flex-wrap md:items-center md:justify-between">
						<div>
							<div className="mb-1 w-fit rounded-full border-wp-alert-yellow bg-wp-alert-yellow/40 px-3 py-1 text-xs uppercase text-gray-900">
								{__('Recommended', 'extendify-local')}
							</div>
							<div className="text-xl font-semibold lowercase">
								{domains[0]}
							</div>
						</div>
						<a
							href={createDomainUrlLink(domainSearchUrl, domains[0])}
							target="_blank"
							onClick={() => {
								handleInteract();
								recordActivity(domains[0], 'primary');
							}}
							className="mt-3 inline-flex h-8 cursor-pointer items-center justify-between rounded-xs border-design-main bg-design-main px-3 py-2 text-center text-sm leading-tight text-design-text no-underline hover:opacity-90 md:mt-0 md:flex"
						>
							{__('Register this domain', 'extendify-local')}
							<Icon icon={chevronRightSmall} className="fill-current" />
						</a>
					</div>
					{/*Secondary domains*/}
					{domains.slice(1).map((domain) => (
						<a
							href={createDomainUrlLink(domainSearchUrl, domain)}
							target="_blank"
							className="flex h-11 cursor-pointer items-center justify-between border-b border-gray-200 px-6 py-3.5 text-sm font-normal lowercase text-gray-800 no-underline last:border-transparent hover:bg-gray-50"
							onClick={() => {
								handleInteract();
								recordActivity(domain, 'secondary');
							}}
							key={domain}
						>
							{domain}
							<Icon icon={chevronRightSmall} />
						</a>
					))}
				</div>
			</div>
		</div>
	);
};
