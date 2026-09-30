import { GeneratePageResult } from '@agent/workflows/content/components/GeneratePageResult';

const { context, abilities } = window.extAgentData;

export default {
	available: () =>
		!['page', 'post'].includes(context?.adminPage) &&
		context.isBlockTheme &&
		abilities.canEditPosts,
	id: 'create-page',
	whenFinished: { component: GeneratePageResult },
};
