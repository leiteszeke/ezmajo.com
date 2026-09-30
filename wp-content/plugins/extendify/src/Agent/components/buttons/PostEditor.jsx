import { magic, magicAnimated } from '@agent/icons';
import { useGlobalStore } from '@agent/state/global';
import { Button } from '@wordpress/components';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import classNames from 'classnames';

export const PostEditor = () => {
	const { toggleOpen, open, isMobile } = useGlobalStore();
	const [animate, setAnimate] = useState(false);
	const [animateIcon, setAnimateIcon] = useState(false);
	const pageLoaded = useRef(false);

	useEffect(() => {
		// Don't run this on the first page load
		if (!pageLoaded.current) {
			pageLoaded.current = true;
			return;
		}
		if (open || isMobile) return;
		setAnimate(true);
		setAnimateIcon(true);
		const id = setTimeout(() => {
			setAnimate(false);
		}, 1500);
		const iconId = setTimeout(() => {
			setAnimateIcon(false);
		}, 5000);
		return () => {
			clearTimeout(id);
			clearTimeout(iconId);
		};
	}, [open, isMobile]);

	if (isMobile) return null;

	return (
		<Button
			variant="primary"
			icon={animateIcon ? magicAnimated : magic}
			iconPosition="left"
			className="is-compact has-text relative z-10"
			onClick={() => {
				if (open) setAnimate(true);
				toggleOpen();
			}}
			aria-label={__('Open Agent', 'extendify-local')}
		>
			<span
				className={classNames('px-1 leading-none', {
					'extendify-gradient-animation': animate,
				})}
			>
				{__('AI Agent', 'extendify-local')}
			</span>
		</Button>
	);
};
