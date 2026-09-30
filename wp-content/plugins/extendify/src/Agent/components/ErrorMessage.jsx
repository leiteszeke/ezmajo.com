import { __ } from '@wordpress/i18n';

export const ErrorMessage = ({ children }) => (
	<div className="mb-4 ms-2 me-2 min-w-0 flex-1 flex-col gap-1 rtl:flex">
		<div className="flex items-center gap-2 border-l-4 border-l-wp-alert-red bg-wp-notice-error p-3 text-gray-900">
			<div className="text-wp-alert-red">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={1.5}
					stroke="currentColor"
					className="size-6"
				>
					<title>{__('Error icon', 'extendify-local')}</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
					/>
				</svg>
			</div>
			<div className="text-sm">{children}</div>
		</div>
	</div>
);
