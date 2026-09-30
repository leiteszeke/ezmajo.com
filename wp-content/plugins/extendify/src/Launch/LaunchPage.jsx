import { updateOption } from '@launch/api/WPApi';
import { RestartLaunchModal } from '@launch/components/RestartLaunchModal';
import { RetryNotice } from '@launch/components/RetryNotice';
import { useTelemetry } from '@launch/hooks/useTelemetry';
import { CreatingSite } from '@launch/pages/CreatingSite';
import { NeedsTheme } from '@launch/pages/NeedsTheme';
import { useGlobalStore } from '@launch/state/Global';
import { usePagesStore } from '@launch/state/Pages';
import { safeParseJson } from '@shared/lib/parsing';
import { registerCoreBlocks } from '@wordpress/block-library';
import { getBlockTypes } from '@wordpress/blocks';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { SWRConfig, useSWRConfig } from 'swr';

export const LaunchPage = () => {
	const { updateSettings } = useDispatch('core/block-editor');
	const [retrying, setRetrying] = useState(false);
	const { component: CurrentPage, state } = usePagesStore((state) =>
		state.getCurrentPageData(),
	);
	const { fetcher, fetchData } = usePagesStore((state) =>
		state.getNextPageData(),
	);
	const { setPage } = usePagesStore();
	const { mutate } = useSWRConfig();
	const { generating } = useGlobalStore();
	const [show, setShow] = useState(false);
	const [needsTheme, setNeedsTheme] = useState(false);
	const theme = useSelect((select) => select('core').getCurrentTheme());
	useTelemetry();
	const once = useRef(false);

	const page = () => {
		if (needsTheme) return <NeedsTheme />;
		if (generating) return <CreatingSite />;
		if (!CurrentPage) return null;
		return (
			<>
				<RestartLaunchModal setPage={setPage} />
				<CurrentPage />
			</>
		);
	};

	useEffect(() => {
		if (once.current) return;
		once.current = true;
		// on page load, if we are on a page without nav, go to the first page
		if (state.getState().useNav) return;
		setPage(0);
	}, [state, setPage]);

	useEffect(() => {
		// translators: Launch is a noun.
		document.title = __('Launch - AI-Powered Web Creation', 'extendify-local');
	}, []);

	useEffect(() => {
		// Add editor styles to use for live previews
		let editorStyles = window.extOnbData.editorStyles;
		const settings = safeParseJson(editorStyles);

		// Fix asset URLs when the site is accessed via a different domain than
		// configured (e.g., temporary/staging URLs in hosted environments).
		// This prevents CORS errors with fonts in BlockPreview iframes.
		const baseURL = settings?.styles?.find((s) => s.baseURL)?.baseURL;
		if (baseURL) {
			try {
				const configuredHost = new URL(baseURL).host;
				const currentHost = window.location.host;
				if (configuredHost !== currentHost) {
					editorStyles = editorStyles.replaceAll(configuredHost, currentHost);
					updateSettings(safeParseJson(editorStyles));
					return;
				}
			} catch (_e) {
				// Invalid URL, skip rewriting
			}
		}

		updateSettings(settings);
	}, [updateSettings]);

	useEffect(() => {
		if (getBlockTypes().length !== 0) return;
		registerCoreBlocks();
	}, []);

	useEffect(() => {
		// Check that the textdomain came back and that it's extendable
		if (!theme?.textdomain) return;
		if (theme?.textdomain === 'extendable') return;
		setNeedsTheme(true);
	}, [theme]);

	useEffect(() => {
		setShow(true);
		updateOption('extendify_launch_loaded', new Date().toISOString());
	}, []);

	useEffect(() => {
		const fetchers = [].concat(fetcher);
		const fetchDataArrays = [].concat(fetchData);
		if (fetchers.length) {
			fetchers.forEach((fetcher, i) => {
				try {
					const data =
						typeof fetchDataArrays?.[i] === 'function'
							? fetchDataArrays[i]()
							: fetchDataArrays?.[i];
					mutate(data, (last) => last || fetcher(data), { revalidate: false });
				} catch (_e) {
					//
				}
			});
		}
	}, [fetcher, mutate, fetchData]);

	if (!show) return null;

	return (
		<SWRConfig
			value={{
				errorRetryInterval: 1000,
				onErrorRetry: (error, key, _config, revalidate, { retryCount }) => {
					if (error?.data?.status === 403) {
						// if they are logged out, we can't recover
						window.location.reload();
						return;
					}
					if (retrying) return;

					// TODO: Add back when we have something to show here
					// if (retryCount >= 5) {
					//     console.error('Encountered unrecoverable error', error)
					//     throw new Error(error?.message ?? 'Unknown error')
					// }
					console.error(key, error);
					setRetrying(true);
					setTimeout(() => {
						setRetrying(false);
						revalidate({ retryCount });
					}, 5000);
				},
			}}
		>
			<div
				style={{ zIndex: 99999 + 1 }} // 1 more than the library
				className="fixed inset-0 h-screen w-screen overflow-y-auto bg-white md:overflow-hidden"
			>
				{page()}
			</div>
			<RetryNotice show={retrying} />
		</SWRConfig>
	);
};
