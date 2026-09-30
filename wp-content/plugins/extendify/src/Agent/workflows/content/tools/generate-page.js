import { generatePage } from '@agent/workflows/content/components/PageContentShell';

export default async ({ pageDescription }) => {
	// Input validation
	if (!pageDescription || pageDescription.trim().length === 0) {
		throw new Error('Page description cannot be empty');
	}
	// this should return the page data
	const data = await generatePage(pageDescription);

	if (!data?.id) {
		throw new Error('Page creation failed');
	}

	return { postId: Number(data.id) };
};
