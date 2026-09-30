import { KB_HOST } from '@constants';
import { useKnowledgeBaseStore } from '@help-center/state/knowledge-base.js';
import { useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { closeSmall, Icon, search as sIcon } from '@wordpress/icons';
import classNames from 'classnames';

export const SearchForm = ({ onChange }) => {
	const { searchTerm, clearSearchTerm, reset } = useKnowledgeBaseStore();
	const warmed = useRef(false);
	const searchRef = useRef();

	return (
		<form
			method="get"
			onSubmit={(e) => e.preventDefault()}
			className="relative h-10 w-full"
		>
			<label htmlFor="ext-help-center-search" className="sr-only">
				{__('Search for articles', 'extendify-local')}
			</label>
			<input
				ref={searchRef}
				name="ext-kb-search"
				// biome-ignore lint: allow autofocus
				autoFocus
				autoCapitalize="off"
				id="ext-help-center-search"
				type="text"
				value={searchTerm ?? ''}
				onChange={(e) => onChange(e.target.value)}
				onFocus={() => {
					if (warmed.current) return;
					warmed.current = true;
					fetch(`${KB_HOST}/api/posts?boot=true`, { method: 'POST' });
				}}
				placeholder={__('What do you need help with?', 'extendify-local')}
				className="input border-text-800 h-10 w-full border px-3 text-sm placeholder-gray-600"
			/>
			<div className="absolute inset-y-5 right-2 flex items-center justify-center text-gray-400 rtl:left-2 rtl:right-auto">
				<Icon
					icon={!searchTerm ? sIcon : closeSmall}
					className={classNames('fill-current', {
						'cursor-pointer': searchTerm,
					})}
					onClick={() => {
						reset();
						clearSearchTerm();
						searchRef.current?.focus();
					}}
					size={24}
				/>
			</div>
		</form>
	);
};
