export const Title = ({ title, description }) => {
	return (
		<>
			<h2 className="m-0 text-center text-2xl leading-8 text-gray-900 md:leading-10">
				{title}
			</h2>
			{description && (
				<p className="m-0 text-center text-base leading-6 text-gray-700">
					{description}
				</p>
			)}
		</>
	);
};
