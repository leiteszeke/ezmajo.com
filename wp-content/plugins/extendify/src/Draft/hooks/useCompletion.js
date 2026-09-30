import { completion } from '@draft/api/Data';
import { useEffect, useState } from '@wordpress/element';

export const useCompletion = (
	prompt,
	promptType,
	systemMessageKey,
	details,
) => {
	const [result, setResult] = useState('');
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let canceled = false;
		let reader;
		const decoder = new TextDecoder();

		if (!prompt) {
			setLoading(false);
			setResult('');
			canceled = true;
			return;
		}

		const fetchData = async () => {
			setResult('');
			setError(false);
			setLoading(true);

			const response = await completion(
				prompt,
				promptType,
				systemMessageKey,
				details,
			);
			reader = response.body.getReader();

			let done = false;
			while (!done) {
				const { value, done: readerDone } = await reader.read();

				done = readerDone;

				if (value && !canceled) {
					const decodedValue = decoder.decode(value);
					setResult((prevResult) => prevResult + decodedValue);
				}
			}
		};

		fetchData()
			.finally(() => {
				if (!canceled) {
					setLoading(false);
				}
			})
			.catch((error) => {
				if (!canceled) {
					setError(error);
				}
			});

		return () => {
			canceled = true;
			if (reader) {
				reader.cancel();
			}
		};
	}, [prompt, systemMessageKey, promptType, details]);

	return { completion: result, error, loading };
};
