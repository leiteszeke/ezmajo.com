// The one scroller on the page: a second one breaks scrolling on mobile.
export const PageCanvas = ({ children }) => (
	<div className="relative h-dvh bg-ui-page text-ui-page-text text-ui-body font-ui-body overflow-y-auto">
		<div className="relative z-10 min-h-dvh w-full flex flex-col items-center justify-between p-6">
			{children}
		</div>
	</div>
);
