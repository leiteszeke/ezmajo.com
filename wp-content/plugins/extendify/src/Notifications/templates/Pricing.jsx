import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { createInterpolateElement } from '@wordpress/element';
import { check, Icon } from '@wordpress/icons';
import { Cta } from '../Cta';
import { cardVariables, colorsOf } from '../colors';
import { DismissButton } from '../DismissButton';

export const Pricing = ({
	notification,
	href,
	external,
	dismissible,
	onDismiss,
	onClick,
}) => {
	const { title, content } = notification;
	const {
		price,
		'price-detail': priceDetail,
		description,
		items,
	} = notification.offer ?? {};
	const colors = colorsOf(notification);

	return (
		// Dialog portals to the body, so the prefix scope has to travel with it.
		<Dialog
			open
			static
			className="extendify-notifications"
			onClose={dismissible ? onDismiss : () => undefined}
		>
			{/* The agent loading rail in Skeleton.php sits at 1000001, over z-higher. */}
			<div className="fixed inset-0 z-max-1 flex items-center justify-center p-4">
				<div className="fixed inset-0 bg-black/60" aria-hidden="true" />
				<DialogPanel
					className="relative w-full max-w-lg rounded-xl bg-(--ext-notification-card-main,#ffffff) p-8 text-base text-(--ext-notification-card-text,#1e1e1e) shadow-2xl"
					style={cardVariables(colors)}
					data-test="notification-pricing"
				>
					{dismissible && (
						<DismissButton
							onClick={onDismiss}
							size={24}
							className="absolute right-3 top-3 flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-current opacity-60 hover:opacity-100 rtl:left-3 rtl:right-auto"
						/>
					)}
					{/* An <h2> would pick up the theme's heading font and casing on the front end. */}
					<DialogTitle
						as="div"
						className="m-0 text-3xl font-bold leading-tight"
					>
						{title}
					</DialogTitle>
					<p className="mt-3 text-sm leading-relaxed">{content}</p>
					{(price || priceDetail || description) && (
						<div
							className="mt-6 flex flex-col gap-2"
							data-test="notification-pricing-price"
						>
							{(price || priceDetail) && (
								<div className="flex items-baseline gap-1.5">
									{price && <span className="text-4xl font-bold">{price}</span>}
									{priceDetail && (
										<span className="text-sm">{priceDetail}</span>
									)}
								</div>
							)}
							{description && (
								<p className="m-0 text-sm font-bold">{description}</p>
							)}
						</div>
					)}
					{items?.length > 0 && (
						<ul
							className="my-6 list-none border-0 border-t border-solid border-[#e5e7eb] p-0 pt-6 text-sm"
							data-test="notification-pricing-items"
						>
							{items.map((item) => (
								<li key={item} className="mb-4 flex items-center gap-3">
									<span
										className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-[#16a34a]"
										data-test="notification-pricing-check"
									>
										<Icon icon={check} size={18} className="fill-current" />
									</span>
									<span>
										{createInterpolateElement(item, { strong: <strong /> })}
									</span>
								</li>
							))}
						</ul>
					)}
					<Cta
						notification={notification}
						href={href}
						external={external}
						onClick={onClick}
						surface="design"
						className="flex h-12 w-full cursor-pointer items-center justify-center rounded-md bg-design-main px-4 text-sm font-semibold text-design-text no-underline"
					/>
				</DialogPanel>
			</div>
		</Dialog>
	);
};
