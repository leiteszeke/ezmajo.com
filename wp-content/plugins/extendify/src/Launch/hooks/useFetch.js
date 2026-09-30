import useSWR from 'swr';

export const useFetch = (params, fetcher, options = {}) => {
	const { data, error } = useSWR(params, (key) => fetcher(key), {
		revalidateIfStale: false,
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
		...options,
	});

	return {
		data,
		loading: !data && !error && !error?.message,
		error,
	};
};
