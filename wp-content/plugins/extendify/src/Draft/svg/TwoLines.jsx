import { Path, SVG } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const twoLines = (
	<SVG xmlns="http://www.w3.org/2000/svg" width="24" height="24">
		<title>{__('Two Lines Icon', 'extendify-local')}</title>
		<Path d="M4 10.5h16V9H4v1.5ZM4 15h9v-1.5H4V15Z" />
	</SVG>
);

export default twoLines;
