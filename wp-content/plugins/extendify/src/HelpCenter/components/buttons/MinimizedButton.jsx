import { Topbar } from '@help-center/components/modal/TopBar';

export const MinimizedButton = () => (
	<div
		className="overflow-hidden rounded-md border border-gray-500 shadow-2xl"
		data-test="help-center-minimize-state"
	>
		<Topbar />
	</div>
);
