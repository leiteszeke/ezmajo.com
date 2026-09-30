export const isAtLeastNDaysAgo = (dateString = new Date(), numDays = 0) => {
	const siteCreatedDaysAgo = Math.floor(
		(Date.now() - new Date(dateString)) / (1000 * 60 * 60 * 24),
	);
	// Account for future time zones by min 0
	return Math.max(0, siteCreatedDaysAgo) >= Number(numDays);
};
