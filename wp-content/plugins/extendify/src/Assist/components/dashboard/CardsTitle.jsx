import { __ } from '@wordpress/i18n';

export const CardsTitle = ({ total = 8, totalCompleted = 3 }) => (
	<div className="flex w-full items-center justify-between space-x-2 border-b border-gray-300 px-5 py-3.5 lg:px-6">
		<span className="text-base font-semibold">
			{__('Site Guide', 'extendify-local')}
		</span>
		<div className="flex w-3/5 items-center gap-2">
			<div className="h-2.5 w-full rounded-xl bg-gray-300">
				<div
					className="h-2.5 rounded-xl bg-design-main"
					style={{
						width: `${100 / (total / totalCompleted)}%`,
					}}
				></div>
			</div>
			<div className="text-xs text-gray-700">
				{totalCompleted}/{total}
			</div>
		</div>
	</div>
);
