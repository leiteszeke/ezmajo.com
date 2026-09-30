const normalizeAssignment = (assignment) => ({
	variant: assignment?.variant ?? null,
	percentage:
		typeof assignment?.percentage === 'number' ? assignment.percentage : null,
});

export const getAbTest = (key) =>
	normalizeAssignment(window.extLaunchData?.activeTests?.[key]);
