import axios from 'axios';

const Axios = axios.create({
	baseURL: window.extSharedData.root,
	headers: {
		'X-WP-Nonce': window.extSharedData.nonce,
		'X-Requested-With': 'XMLHttpRequest',
		'X-Extendify': true,
	},
});

Axios.interceptors.response.use(
	(response) => findResponse(response),
	(error) => handleErrors(error),
);

const findResponse = (response) => {
	return Object.hasOwn(response, 'data') ? response.data : response;
};

const handleErrors = (error) => {
	if (!error.response) {
		return;
	}
	console.error(error.response);
	// if 4XX, return the error object
	if (error.response.status >= 400 && error.response.status < 500) {
		return Promise.reject(error.response);
	}
	return Promise.reject(findResponse(error.response));
};

export { Axios };
