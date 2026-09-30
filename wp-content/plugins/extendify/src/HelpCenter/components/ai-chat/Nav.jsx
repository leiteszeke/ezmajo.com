import { useAIChatStore } from '@help-center/state/ai-chat';
import { Dropdown, Icon, MenuGroup, MenuItem } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { check, moreVertical } from '@wordpress/icons';

export const Nav = ({ setShowHistory }) => {
	const experienceLevels = {
		beginner: __('Beginner', 'extendify-local'),
		intermediate: __('Intermediate', 'extendify-local'),
		advanced: __('Advanced', 'extendify-local'),
	};
	const { historyCount, hasHistory, experienceLevel, setExperienceLevel } =
		useAIChatStore();

	return (
		<nav className="absolute right-0 z-10 mx-4 mt-3 flex items-center justify-between gap-2">
			<div className="flex items-center gap-2">
				<Dropdown
					className="flex"
					contentClassName="origin-top-right rounded-md shadow-lg bg-white ring-1 ring-black/5 focus:outline-hidden"
					popoverProps={{ placement: 'bottom-start' }}
					renderToggle={({ onToggle }) => (
						<span>
							<Icon
								icon={moreVertical}
								onClick={onToggle}
								size={28}
								className="cursor-pointer rounded-sm fill-current p-1 text-design-text hover:bg-white/10"
							/>
							<span className="sr-only">
								{__('Toggle menu', 'extendify-local')}
							</span>
						</span>
					)}
					renderContent={({ onClose }) => (
						<MenuGroup label={__('WordPress Comfort Level', 'extendify-local')}>
							{Object.entries(experienceLevels).map(([key, label]) => (
								<MenuItem
									key={key}
									isSelected={experienceLevel === key}
									onClick={() => {
										setExperienceLevel(key);
										onClose();
									}}
									icon={experienceLevel === key ? check : null}
								>
									{label}
								</MenuItem>
							))}
							<hr />
							<MenuItem
								disabled={!hasHistory()}
								onClick={() => {
									setShowHistory(true);
									onClose();
								}}
							>
								{
									// translators: %d: number of chat history items
									sprintf(
										__('Chat History (%d)', 'extendify-local'),
										historyCount,
									)
								}
							</MenuItem>
						</MenuGroup>
					)}
				/>
			</div>
		</nav>
	);
};
