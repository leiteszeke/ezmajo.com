import { failWithFallback } from '@auto-launch/functions/helpers';
import { z } from 'zod';

/**
 * An unknown variable must not sink a design authored against a newer build.
 * A number is a CSS value too, so `0.88` is not dropped.
 */
export const designShape = z.object({
	vars: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
	shader: z.string().optional(),
	logo: z.string().optional(),
	templates: z.record(z.string(), z.string()).optional(),
});

export const handleDesign = async () =>
	failWithFallback(
		async () => designShape.parse(window.extLaunchData?.customDesign ?? {}),
		{},
		{ error: { message: 'Design config unreadable', name: 'DesignError' } },
	);
