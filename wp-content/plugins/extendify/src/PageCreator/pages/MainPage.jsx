import { RetryNotice } from '@page-creator/components/RetryNotice';
import { usePagesStore } from '@page-creator/state/pages';
import { useState } from '@wordpress/element';
import { SWRConfig } from 'swr';

export const MainPage = ({ insertPage }) => {
	const [retrying, setRetrying] = useState(false);
	const { component: CurrentPage } = usePagesStore((state) =>
		state.getCurrentPageData(),
	);

	const page = () => {
		if (!CurrentPage) return null;
		return <CurrentPage insertPage={insertPage} />;
	};

	return (
		<SWRConfig
			value={{
				errorRetryInterval: 1000,
				onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
					console.error(error);
					if (error?.data?.status === 403) {
						// if they are logged out, we can't recover
						window.location.reload();
						return;
					}
					if (retrying) return;
					setRetrying(true);
					setTimeout(() => {
						setRetrying(false);
						revalidate({ retryCount });
					}, 5000);
				},
			}}
		>
			{page()}
			<RetryNotice show={retrying} />
		</SWRConfig>
	);
};
