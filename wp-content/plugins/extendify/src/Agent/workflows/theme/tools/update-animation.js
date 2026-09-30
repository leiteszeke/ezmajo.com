import { updateOption } from '@agent/lib/wp';

export default ({ type, speed }) =>
	updateOption('extendify_animation_settings', { type, speed });
