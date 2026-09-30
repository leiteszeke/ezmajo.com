import { Axios as api } from '@launch/api/axios';

export const importTemporaryProducts = () =>
	api.get('launch/import-woocommerce');
