export const Title = ({ title, description }) => (
	<div className="relative mx-auto w-full max-w-xl">
		<div className="mb-8 flex flex-col gap-2 md:mb-10 3xl:mb-12">
			<h2 className="m-0 text-center text-2xl leading-8 text-gray-900 md:leading-10">
				{title}
			</h2>
			{description && (
				<p className="m-0 text-center text-base leading-6 text-gray-700">
					{description}
				</p>
			)}
		</div>
	</div>
);
