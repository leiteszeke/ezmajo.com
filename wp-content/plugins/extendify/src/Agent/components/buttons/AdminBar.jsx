import { magic } from '@agent/icons';
import { useGlobalStore } from '@agent/state/global';
import { Icon } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import classNames from 'classnames';
import { motion } from 'framer-motion';

// TODO: this isnt great if we allow the user to "pop out" the sidebar
const isSidebarDocked = window.extAgentData.agentPosition !== 'floating';

export const AdminBar = () => {
	const { toggleOpen, open, isMobile } = useGlobalStore();

	if (isMobile) return null;

	return (
		<motion.button
			type="button"
			initial={false}
			animate={{
				width: isSidebarDocked ? (open ? 0 : 'auto') : 'auto',
				opacity: isSidebarDocked ? (open ? 0 : 100) : 100,
			}}
			transition={{
				width: { duration: 0.3, ease: 'easeInOut' },
				opacity: { duration: 0.1, ease: 'easeInOut' },
			}}
			className={classNames(
				'items-center justify-center gap-1 border-0 leading-extra-tight text-white md:inline-flex whitespace-nowrap',
				{ 'opacity-60': open && !isSidebarDocked },
				// Open, docked sidebar (keeps the spacing)
				{ 'h-full mr-1 rtl:ml-1 rtl:mr-0': open && isSidebarDocked },
				{
					// Styles for when docked sidebar is open
					// Useful to put things here you don't want to animate out
					// Pill sizing matches the simple toolbar's .ext-tb-ai-agent
					'my-1 ml-1 mr-2 rtl:ml-2 rtl:mr-1 h-6 rounded px-[10px] bg-[#3858e9] hover:bg-[#2145e6]':
						!isSidebarDocked || (isSidebarDocked && !open),
				},
			)}
			onClick={() => toggleOpen()}
			aria-label={__('Open Agent', 'extendify-local')}
		>
			<Icon className="shrink-0" icon={magic} width={20} height={20} />
			<span className="leading-none">{__('AI Agent', 'extendify-local')}</span>
		</motion.button>
	);
};
