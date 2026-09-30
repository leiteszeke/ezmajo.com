import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const store = () => ({
	generating: false,
});
const withDevtools = devtools(store, { name: 'Extendify Launch Globals' });
export const useGlobalStore = create(withDevtools);
