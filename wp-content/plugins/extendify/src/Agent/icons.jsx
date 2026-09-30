import { __ } from '@wordpress/i18n';
import { motion } from 'framer-motion';

export const magic = (
	<svg
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{__('Magic Icon', 'extendify-local')}</title>
		<path
			d="M17.0909 9.81818L18 7.81818L20 6.90909L18 6L17.0909 4L16.1818 6L14.1818 6.90909L16.1818 7.81818L17.0909 9.81818Z"
			fill="currentColor"
		/>
		<path
			d="M17.0909 14.1818L16.1818 16.1818L14.1818 17.0909L16.1818 18L17.0909 20L18 18L20 17.0909L18 16.1818L17.0909 14.1818Z"
			fill="currentColor"
		/>
		<path
			d="M11.6364 10.1818L9.81818 6.18182L8 10.1818L4 12L8 13.8182L9.81818 17.8182L11.6364 13.8182L15.6364 12L11.6364 10.1818ZM10.5382 12.72L9.81818 14.3055L9.09818 12.72L7.51273 12L9.09818 11.28L9.81818 9.69455L10.5382 11.28L12.1236 12L10.5382 12.72Z"
			fill="currentColor"
		/>
	</svg>
);

export const magicAnimated = (
	<motion.svg
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		overflow="visible"
		xmlns="http://www.w3.org/2000/svg"
		initial="hidden"
		animate="visible"
	>
		<title>{__('Magic Sparkle Animation', 'extendify-local')}</title>
		<motion.path
			d="M17.0909 9.81818L18 7.81818L20 6.90909L18 6L17.0909 4L16.1818 6L14.1818 6.90909L16.1818 7.81818L17.0909 9.81818Z"
			fill="currentColor"
			variants={{
				hidden: { scale: 1, opacity: 0.8 },
				visible: {
					scale: [1, 1.05, 1],
					opacity: [1, 0.7, 1],
					transition: { repeat: 3, duration: 1.2, delay: 0.2 },
				},
			}}
		/>
		<motion.path
			d="M17.0909 14.1818L16.1818 16.1818L14.1818 17.0909L16.1818 18L17.0909 20L18 18L20 17.0909L18 16.1818L17.0909 14.1818Z"
			fill="currentColor"
			variants={{
				hidden: { scale: 1, opacity: 0.8 },
				visible: {
					scale: [1, 1.05, 1],
					opacity: [1, 0.7, 1],
					transition: { repeat: 3, duration: 1.2, delay: 0.6 },
				},
			}}
		/>
		<motion.path
			d="M11.6364 10.1818L9.81818 6.18182L8 10.1818L4 12L8 13.8182L9.81818 17.8182L11.6364 13.8182L15.6364 12L11.6364 10.1818ZM10.5382 12.72L9.81818 14.3055L9.09818 12.72L7.51273 12L9.09818 11.28L9.81818 9.69455L10.5382 11.28L12.1236 12L10.5382 12.72Z"
			fill="currentColor"
			variants={{
				hidden: { scale: 1, opacity: 0.9 },
				visible: {
					scale: [1, 1.03, 1],
					opacity: [1, 0.8, 1],
					transition: { repeat: 3, duration: 1.2, delay: 0.4 },
				},
			}}
		/>
		<motion.circle
			cx="6"
			cy="6"
			r="1.7"
			fill="currentColor"
			initial={{ opacity: 0, scale: 0.5 }}
			animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
			transition={{ repeat: 2, duration: 2, delay: 1.7 }}
		/>
		<motion.circle
			cx="20"
			cy="4"
			r="1"
			fill="currentColor"
			initial={{ opacity: 0, scale: 0.5 }}
			animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
			transition={{ repeat: 3, duration: 1.4, delay: 0.8 }}
		/>
		<motion.circle
			cx="4"
			cy="20"
			r="0.7"
			fill="currentColor"
			initial={{ opacity: 0, scale: 0.5 }}
			animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
			transition={{ repeat: 3, duration: 1.2, delay: 1.4 }}
		/>
	</motion.svg>
);

export const thumbDown = (
	<svg
		width="24"
		height="24"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{__('Thumb Down Icon', 'extendify-local')}</title>
		<path d="M14.1818 5H7.63636C7.03273 5 6.51636 5.36364 6.29818 5.88727L4.10182 11.0145C4.03636 11.1818 4 11.3564 4 11.5455V13C4 13.8 4.65455 14.4545 5.45455 14.4545H10.0436L9.35273 17.7782L9.33091 18.0109C9.33091 18.3091 9.45455 18.5855 9.65091 18.7818L10.4218 19.5455L15.2145 14.7527C15.4764 14.4909 15.6364 14.1273 15.6364 13.7273V6.45455C15.6364 5.65455 14.9818 5 14.1818 5ZM14.1818 13.7273L11.0255 16.8836L12 13H5.45455V11.5455L7.63636 6.45455H14.1818V13.7273ZM17.0909 5H20V13.7273H17.0909V5Z" />
	</svg>
);

export const thumbUp = (
	<svg
		width="24"
		height="24"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{__('Thumb Up Icon', 'extendify-local')}</title>
		<path d="M9.81818 19.5455H16.3636C16.9673 19.5455 17.4836 19.1818 17.7018 18.6582L19.8982 13.5309C19.9636 13.3636 20 13.1891 20 13V11.5455C20 10.7455 19.3455 10.0909 18.5455 10.0909H13.9564L14.6473 6.76727L14.6691 6.53455C14.6691 6.23636 14.5455 5.96 14.3491 5.76364L13.5782 5L8.78545 9.79273C8.52364 10.0545 8.36364 10.4182 8.36364 10.8182V18.0909C8.36364 18.8909 9.01818 19.5455 9.81818 19.5455ZM9.81818 10.8182L12.9745 7.66182L12 11.5455H18.5455V13L16.3636 18.0909H9.81818V10.8182ZM4 10.8182H6.90909V19.5455H4V10.8182Z" />
	</svg>
);

export const sparkle = (
	<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<title>{__('Sparkle Icon', 'extendify-local')}</title>
		<path d="M16.4545 10.0909L17.25 8.34091L19 7.54545L17.25 6.75L16.4545 5L15.6591 6.75L13.9091 7.54545L15.6591 8.34091L16.4545 10.0909Z" />
		<path d="M16.4545 13.9091L15.6591 15.6591L13.9091 16.4545L15.6591 17.25L16.4545 19L17.25 17.25L19 16.4545L17.25 15.6591L16.4545 13.9091Z" />
		<path d="M11.6818 10.4091L10.0909 6.90909L8.5 10.4091L5 12L8.5 13.5909L10.0909 17.0909L11.6818 13.5909L15.1818 12L11.6818 10.4091ZM10.7209 12.63L10.0909 14.0173L9.46091 12.63L8.07364 12L9.46091 11.37L10.0909 9.98273L10.7209 11.37L12.1082 12L10.7209 12.63Z" />
	</svg>
);

export const toolSelect = (
	<svg
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{__('Tool Select Icon', 'extendify-local')}</title>
		<path
			d="M5 9V6C5 5.44772 5.44772 5 6 5H9"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<path
			d="M17.9799 16.1255C17.9 16.1483 17.8203 16.1708 17.742 16.1958C17.3245 16.3292 16.8439 16.5227 16.4734 16.8175C16.1305 17.0903 15.8256 17.4777 15.5793 17.8342C15.5307 17.9046 15.4826 17.9763 15.4353 18.0489L14.3938 13.9163L17.9799 16.1255Z"
			stroke="currentColor"
			strokeWidth="2"
		/>
		<path
			d="M15 5L18 5C18.5523 5 19 5.44772 19 6L19 9"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<path
			d="M9 19L6 19C5.44772 19 5 18.5523 5 18L5 15"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
	</svg>
);

export const selectedContent = (
	<svg
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{__('Selected Content Icon', 'extendify-local')}</title>
		<path
			d="M5 9V6C5 5.44772 5.44772 5 6 5H9"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<path
			d="M19 15L19 18C19 18.5523 18.5523 19 18 19L15 19"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<path
			d="M15 5L18 5C18.5523 5 19 5.44772 19 6L19 9"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<path
			d="M9 19L6 19C5.44772 19 5 18.5523 5 18L5 15"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<path
			d="M15 9H9V10.0588H15V9ZM9 11.4706H15V12.5294H9V11.4706ZM15 13.9412H9V15H15V13.9412Z"
			fill="currentColor"
		/>
	</svg>
);

export const cancelRequest = (
	<svg
		height="14"
		viewBox="0 0 16 16"
		width="14"
		style={{ color: 'currentcolor' }}
	>
		<title>{__('Cancel', 'extendify-local')}</title>
		<path
			clipRule="evenodd"
			d="M3 3H13V13H3V3Z"
			fill="currentColor"
			fillRule="evenodd"
		></path>
	</svg>
);
