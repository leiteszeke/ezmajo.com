import { usePreviewIframe } from '@library/hooks/usePreviewIframe';
import { BlockPreview } from '@wordpress/block-editor';
import { rawHandler } from '@wordpress/blocks';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import classNames from 'classnames';

export const BlockPreviewButton = ({ insertPattern, code }) => {
	const [ready, setReady] = useState(false);
	const blockRef = useRef();
	const blocks = useMemo(
		() => rawHandler({ HTML: lowerImageQuality(code) }),
		[code],
	);
	const { ready: show } = usePreviewIframe({
		container: blockRef.current,
		ready,
		onIFrameLoaded: () => undefined,
		loadDelay: 50,
	});

	useEffect(() => setReady(true), []);

	return (
		<button
			ref={blockRef}
			type="button"
			aria-label={__('Insert Pattern', 'extendify-local')}
			className={classNames(
				'library-pattern relative z-10 m-0 mb-8 inline-block w-full border bg-transparent p-0 focus:shadow-xs focus:outline-hidden focus:ring-wp focus:ring-design-main focus:ring-offset-2 focus:ring-offset-[#FAFAFA]',
				{
					'border-transparent opacity-0': !show,
					'border-gray-400 opacity-100': show,
				},
			)}
			onClick={() => insertPattern(blocks)}
		>
			<BlockPreview
				blocks={blocks}
				live={false}
				viewportWidth={1400}
				additionalStyles={[
					{
						css: '.rich-text [data-rich-text-placeholder]:after { content: "" }',
					},
				]}
			/>
		</button>
	);
};

const lowerImageQuality = (html) => {
	return html.replace(
		/(https?:\/\/\S+\?w=\d+)/gi,
		'$1&q=10&auto=format,compress&fm=avif',
	);
};
