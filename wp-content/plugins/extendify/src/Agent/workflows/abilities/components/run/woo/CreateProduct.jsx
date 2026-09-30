import executeAbility from '@agent/workflows/abilities/tools/execute-ability';
import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// The picker hands over an attachment id, not a url.
const useImageUrl = (image) => {
	const [url, setUrl] = useState(image?.src ?? null);

	useEffect(() => {
		if (!image?.id || image?.src) return;
		let live = true;
		apiFetch({ path: `/wp/v2/media/${image.id}` })
			.then((media) => {
				if (live) setUrl(media?.source_url ?? null);
			})
			.catch(() => {});
		return () => {
			live = false;
		};
	}, [image?.id, image?.src]);

	return url;
};

// callTool nests an ability result under the ability's own name.
const productFrom = (result) =>
	result?.['woocommerce/product-create']?.product ?? result?.product ?? null;

// Links in an old chat message can point at a product deleted since.
const useProductGone = (productId) => {
	const [gone, setGone] = useState(false);

	useEffect(() => {
		if (!productId) return;
		let live = true;
		executeAbility({
			ability: 'woocommerce/products-query',
			input: { id: productId },
		})
			// wp-admin delete trashes, and the query answers 200 for a trashed product.
			.then((result) => {
				const product = result?.products?.[0];
				if (live && product?.status === 'trash') setGone(true);
			})
			.catch((error) => {
				// Anything but a 404 says nothing about the product itself.
				if (live && error?.data?.status === 404) setGone(true);
			});
		return () => {
			live = false;
		};
	}, [productId]);

	return gone;
};

const Summary = ({ inputs, url }) => {
	const {
		name,
		regular_price: price,
		description,
		short_description: summary,
	} = inputs ?? {};
	const blurb = summary || description;

	return (
		<div className="flex items-start gap-3">
			{url ? (
				<img
					className="m-0 h-16 w-16 shrink-0 rounded-md border border-gray-300 object-cover"
					src={url}
					alt={name ?? ''}
				/>
			) : null}
			<div className="min-w-0 flex-1">
				<p className="m-0 p-0 text-sm font-medium text-gray-900">{name}</p>
				{price ? (
					<p className="m-0 p-0 text-sm text-gray-700">{price}</p>
				) : null}
				{blurb ? (
					<p className="m-0 mt-1 p-0 text-xs text-gray-600">{blurb}</p>
				) : null}
			</div>
		</div>
	);
};

const Footer = ({ product, failed, gone, inputs, onConfirm, onCancel }) => {
	const adminUrl = window?.extSharedData?.adminUrl;

	if (failed) {
		return (
			<div className="p-3 text-sm text-gray-700">
				{__("The product couldn't be created.", 'extendify-local')}
			</div>
		);
	}

	if (gone) {
		return (
			<div className="p-3 text-sm text-gray-700">
				{__('Product not found.', 'extendify-local')}
			</div>
		);
	}

	if (product) {
		return (
			<div className="flex justify-start gap-4 p-3 text-sm">
				{product.permalink ? (
					<a
						className="font-medium text-design-main no-underline"
						href={product.permalink}
						target="_blank"
						rel="noreferrer"
					>
						{__('View product', 'extendify-local')}
					</a>
				) : null}
				{adminUrl && product.id ? (
					<a
						className="font-medium text-design-main no-underline"
						href={`${adminUrl}post.php?post=${product.id}&action=edit`}
					>
						{__('Edit product', 'extendify-local')}
					</a>
				) : null}
			</div>
		);
	}

	if (!onConfirm) {
		return (
			<div className="p-3 text-sm text-gray-700">
				{__('Creating product...', 'extendify-local')}
			</div>
		);
	}

	return (
		<div className="flex justify-start gap-2 p-3">
			<button
				type="button"
				className="w-full rounded-sm border border-gray-500 bg-white p-2 text-sm text-gray-900"
				onClick={onCancel}
			>
				{__('Cancel', 'extendify-local')}
			</button>
			<button
				type="button"
				className="w-full rounded-sm border border-design-main bg-design-main p-2 text-sm text-white"
				onClick={() => onConfirm({ data: inputs ?? {} })}
			>
				{__('Create product', 'extendify-local')}
			</button>
		</div>
	);
};

export const CreateProduct = ({ inputs, result, onConfirm, onCancel }) => {
	const product = productFrom(result);
	const fetched = useImageUrl(product ? null : inputs?.images?.[0]);
	const url = product?.images?.[0]?.url ?? fetched;
	// A result that produced no product is a failed run, not a running one.
	const failed = !!result && !product;
	const gone = useProductGone(product?.id);

	return (
		<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
			<div className="rounded-lg border-b border-gray-300 bg-white p-3">
				<Summary inputs={inputs} url={url} />
			</div>
			<Footer
				product={product}
				failed={failed}
				gone={gone}
				inputs={inputs}
				onConfirm={onConfirm}
				onCancel={onCancel}
			/>
		</div>
	);
};
