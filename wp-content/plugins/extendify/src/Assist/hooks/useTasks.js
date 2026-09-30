import {
	domainSearchUrl,
	showDomainTask,
	showSecondaryDomainTask,
} from '@assist/lib/domains';
import addPage from '@assist/tasks/add-page';
import openAIImageEditor from '@assist/tasks/ai-image-editor';
import openAITextEditor from '@assist/tasks/ai-text-editor';
import demoCard from '@assist/tasks/demo-card';
import domainRecommendation from '@assist/tasks/domain-recommendation';
import editHomepage from '@assist/tasks/edit-homepage';
import helpCenter from '@assist/tasks/help-center';
import helpCenterAi from '@assist/tasks/help-center-ai';
import ionosConnectDomain from '@assist/tasks/ionos-connect-domain';
import openDesignLibrary from '@assist/tasks/open-design-library';
import secondaryDomainRecommendation from '@assist/tasks/secondary-domain-recommendation';
import setupAioseo from '@assist/tasks/setup-aioseo';
import setupGivewp from '@assist/tasks/setup-givewp';
import setupHubspot from '@assist/tasks/setup-hubspot';
import setupMonsterInsights from '@assist/tasks/setup-monsterinsights';
import setupSimplyAppointments from '@assist/tasks/setup-simply-appointments';
import setupSimplyBook from '@assist/tasks/setup-simplybook';
import setupTec from '@assist/tasks/setup-tec';
import setupWoocommerceGermanizedStore from '@assist/tasks/setup-woocommerce-germanized-store';
import setupWoocommerceStore from '@assist/tasks/setup-woocommerce-store';
import setupWpforms from '@assist/tasks/setup-wpforms';
import setupYourwebshop from '@assist/tasks/setup-yourwebshop';
import siteBuilderLauncher from '@assist/tasks/site-builder-launcher';
import updateSiteDescription from '@assist/tasks/update-site-description';
import uploadLogo from '@assist/tasks/upload-logo';
import uploadSiteIcon from '@assist/tasks/upload-site-icon';
import { safeParseJson } from '@shared/lib/parsing';

const activePlugins = window.extSharedData?.activePlugins || [];
const sitePlugins =
	safeParseJson(window.extSharedData.launchDataLegacy)?.state?.sitePlugins ||
	[];

export const useTasks = () => {
	const tasks = Object.values({
		'site-builder-launcher': { ...siteBuilderLauncher },
		'ai-text-editor': { ...openAITextEditor },
		'help-center-ai': { ...helpCenterAi },
		'help-center': { ...helpCenter },
		'ai-image-editor': { ...openAIImageEditor },
		'design-library': { ...openDesignLibrary },
		'domain-recommendation': { ...domainRecommendation },
		'secondary-domain-recommendation': { ...secondaryDomainRecommendation },
		'ionos-connect-domain': { ...ionosConnectDomain },
		'edit-homepage': { ...editHomepage },
		'upload-logo': { ...uploadLogo },
		'upload-site-icon': { ...uploadSiteIcon },
		'update-site-description': { ...updateSiteDescription },
		'add-page': { ...addPage },
		'demo-card': { ...demoCard },
		'setup-woocommerce-store': { ...setupWoocommerceStore },
		'setup-woocommerce-germanized-store': {
			...setupWoocommerceGermanizedStore,
		},
		'setup-hubspot': { ...setupHubspot },
		'setup-givewp': { ...setupGivewp },
		'setup-tec': { ...setupTec },
		'setup-simply-appointments': { ...setupSimplyAppointments },
		'setup-simplybook': { ...setupSimplyBook },
		'setup-aioses': { ...setupAioseo },
		'setup-wpforms': { ...setupWpforms },
		'setup-yourwebshop': { ...setupYourwebshop },
		'setup-monsterinsights': { ...setupMonsterInsights },
	});

	const activePluginSlugs = activePlugins?.map((plugin) => {
		try {
			return plugin.split('/')[0];
		} catch (_e) {
			return plugin;
		}
	});
	const sitePluginSlugs = sitePlugins?.map((p) => p.slug) || [];
	const pluginsToCheck = [
		...new Set([...activePluginSlugs, ...sitePluginSlugs]),
	];

	return {
		tasks: tasks.filter((task) => {
			const {
				dependencies: { plugins },
			} = task;

			return task.show({
				plugins,
				activePlugins: pluginsToCheck,
				showDomainTask: showDomainTask && domainSearchUrl,
				showSecondaryDomainTask: showSecondaryDomainTask && domainSearchUrl,
			});
		}),
	};
};
