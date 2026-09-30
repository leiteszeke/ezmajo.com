import {
	ImagePicker,
	PickerActions,
	PickerButton,
} from '@agent/components/ImagePicker';
import { __ } from '@wordpress/i18n';

const done = (id, result) =>
	window.dispatchEvent(
		new CustomEvent('extendify-agent:client-tool-done', {
			detail: { id, result },
		}),
	);

export const ImageAcquisitionRequest = ({ message }) => {
	const { id, details } = message;
	const { prompt = '', search = '', tab } = details.inputs ?? {};

	return (
		<ImagePicker
			prompt={prompt}
			search={search}
			tab={tab}
			autoGenerate={tab === 'generate'}
			onSubmit={(image) =>
				done(id, { id: image.id, url: image.source_url || image.url })
			}
			onError={(failure) =>
				done(id, { error: failure?.message || 'Image import failed' })
			}
			footer={({ ready, busy, submit }) => (
				<PickerActions>
					<PickerButton
						disabled={busy}
						onClick={() => done(id, { skipped: true })}
					>
						{__('Skip', 'extendify-local')}
					</PickerButton>
					<PickerButton primary disabled={!ready || busy} onClick={submit}>
						{busy
							? __('Saving...', 'extendify-local')
							: __('Submit', 'extendify-local')}
					</PickerButton>
				</PickerActions>
			)}
		/>
	);
};
