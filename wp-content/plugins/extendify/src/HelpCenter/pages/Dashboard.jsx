import { useRouter } from '@help-center/hooks/useRouter';
import { AIChatDashboard } from '@help-center/pages/AIChat';
import { KnowledgeBaseDashboard } from '@help-center/pages/KnowledgeBase';
import { ToursDashboard } from '@help-center/pages/Tours';
import { __ } from '@wordpress/i18n';

export const Dashboard = () => {
	const { navigateTo } = useRouter();
	return (
		<div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-2xl p-4">
			<KnowledgeBaseDashboard onOpen={() => navigateTo('knowledge-base')} />
			<ToursDashboard
				onOpen={() => navigateTo('tours')}
				classes="hidden md:block"
			/>
			{window.extSharedData?.showChat && (
				<AIChatDashboard onOpen={() => navigateTo('ai-chat')} />
			)}
		</div>
	);
};

export const routes = [
	{
		slug: 'dashboard',
		title: __('Help Center', 'extendify-local'),
		component: Dashboard,
	},
];
