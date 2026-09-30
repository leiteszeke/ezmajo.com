import { InstallPlugin } from '@agent/workflows/plugins/components/InstallPlugin';

const { abilities } = window.extAgentData;

export default {
	available: () => abilities.canInstallPlugins && abilities.canActivatePlugins,
	id: 'recommend-plugins',
	whenFinished: { component: InstallPlugin },
};
