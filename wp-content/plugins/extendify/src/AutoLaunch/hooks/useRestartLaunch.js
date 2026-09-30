import { resetLaunchState } from '@auto-launch/functions/setup';
import { useLaunchDataStore } from '@auto-launch/state/launch-data';
import { launchStrings } from '@auto-launch/strings';
import apiFetch from '@wordpress/api-fetch';
import { useState } from '@wordpress/element';

// A build-id deep link must resume its build after the restart cleanup.
export const restartUrl = (href, buildId) => {
	if (!buildId) return null;
	const url = new URL(href);
	url.searchParams.set('build-id', buildId);
	return url.toString();
};

export const useRestartLaunch = ({ pages }) => {
	const { resetSiteInformation } = window.extLaunchData;
	const { navigationsIds, templatePartsIds, pageWithTitleTemplateId } =
		resetSiteInformation || {};
	const globalStylesPostID = window.extSharedData.globalStylesPostID;

	const { reset: resetLaunchData } = useLaunchDataStore();
	const [processing, setProcessing] = useState(false);

	const handleExit = () => {
		window.location.href = `${window.extSharedData.adminUrl}admin.php?page=extendify-assist`;
	};

	const handleOk = async () => {
		setProcessing(true);
		const buildId = useLaunchDataStore.getState().urlParams?.['build-id'];
		try {
			await resetLaunchState();
		} catch (resetError) {
			console.warn('Failed to reset launch state:', resetError);
		}
		resetLaunchData({ exclude: ['descriptionBackup'] });
		localStorage.removeItem(
			`extendify-agent-workflows-${window.extSharedData.siteId}`,
		);
		for (const pageId of pages) {
			try {
				await apiFetch({
					path: `/wp/v2/pages/${pageId}`,
					method: 'DELETE',
				});
			} catch (responseError) {
				console.warn(
					`delete pages failed to delete a page (id: ${pageId}) with the following error`,
					responseError,
				);
			}
		}
		// They could be posts
		for (const pageId of pages) {
			try {
				await apiFetch({
					path: `/wp/v2/posts/${pageId}`,
					method: 'DELETE',
				});
			} catch (responseError) {
				console.warn(
					`delete posts failed to delete a page (id: ${pageId}) with the following error`,
					responseError,
				);
			}
		}
		for (const navigationId of navigationsIds || []) {
			try {
				await apiFetch({
					path: `/wp/v2/navigation/${navigationId}`,
					method: 'DELETE',
				});
			} catch (responseError) {
				console.warn(
					`delete navigation failed to delete a navigation (id: ${navigationId}) with the following error`,
					responseError,
				);
			}
		}

		for (const template of templatePartsIds || []) {
			try {
				await apiFetch({
					path: `/wp/v2/template-parts/${template}?force=true`,
					method: 'DELETE',
				});
			} catch (responseError) {
				console.warn(
					`delete template failed to delete template (id: ${template}) with the following error`,
					responseError,
				);
			}
		}

		try {
			if (pageWithTitleTemplateId) {
				await apiFetch({
					path: `/wp/v2/templates/${pageWithTitleTemplateId}?force=true`,
					method: 'DELETE',
				});
			}
		} catch (responseError) {
			console.warn('Failed to delete page-with-title template:', responseError);
		}

		try {
			if (globalStylesPostID) {
				await apiFetch({
					path: `/wp/v2/global-styles/${globalStylesPostID}`,
					method: 'POST',
					body: JSON.stringify({ settings: {}, styles: {} }),
				});
			}
		} catch (styleResetError) {
			console.warn(
				'Failed to reset global styles with the following error:',
				styleResetError,
			);
		}

		const target = restartUrl(window.location.href, buildId);
		if (target) {
			window.location.href = target;
			return;
		}
		window.location.reload();
	};

	const strings = launchStrings();

	return {
		title: strings.restartTitle,
		body: strings.restartBody,
		note: strings.restartNote(pages.length),
		exit: { label: strings.restartExit, onClick: handleExit },
		confirm: {
			label: strings.restartConfirm,
			processing,
			onClick: handleOk,
		},
	};
};
