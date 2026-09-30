import apiFetch from '@wordpress/api-fetch';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useInstalledPluginsCache = create(
	persist(
		(set) => ({
			installedPlugins: window.extSharedData?.activePlugins?.map(
				(plugin) => plugin.split('/')[0],
			),
			updateInstalledPlugins: async () => {
				const installedPlugins = (
					await apiFetch({
						path: '/wp/v2/plugins',
						method: 'GET',
					})
				)?.map((plugin) => plugin.plugin.split('/')[0]);

				set({ installedPlugins });
			},
		}),
		{
			name: `extendify-page-creator-page-installed-plugins-cache-${window.extSharedData.siteId}`,
		},
	),
);
