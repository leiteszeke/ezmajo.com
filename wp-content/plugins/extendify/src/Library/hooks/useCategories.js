import { PATTERNS_HOST } from '@constants';
import { useState } from '@wordpress/element';
import useSWRImmutable from 'swr/immutable';

const fetcher = async () => {
	const urlParams = new URLSearchParams({
		wpVersion: window.extSharedData.wpVersion || null,
		lang: window.extSharedData.wpLanguage || null,
	});
	return await fetch(
		`${PATTERNS_HOST}/api/categories?${urlParams.toString()}`,
	).then((res) => res.json());
};

export const useCategories = () => {
	const [errorCount, setErrorCount] = useState(0);
	const lang = window.extSharedData?.wpLanguage ?? 'en_US';
	const { data, error, isLoading } = useSWRImmutable(
		`categories-${lang}`,
		fetcher,
		{
			onError: () => setErrorCount((prev) => prev + 1),
			onSuccess: () => setErrorCount(0),
		},
	);
	return {
		data,
		errorCount: errorCount > 1 ? errorCount : error ? 1 : 0,
		isLoading,
	};
};
