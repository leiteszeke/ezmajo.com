import { memo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const Checkmark = (props) => {
	const { className, ...otherProps } = props;

	return (
		<svg
			className={className}
			viewBox="0 0 22 22"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...otherProps}
		>
			<title>{__('Checkmark', 'extendify-local')}</title>
			<path
				d="M8.72912 13.7449L5.77536 10.7911L4.76953 11.7899L8.72912 15.7495L17.2291 7.24948L16.2304 6.25073L8.72912 13.7449Z"
				fill="currentColor"
			/>
		</svg>
	);
};

export default memo(Checkmark);
