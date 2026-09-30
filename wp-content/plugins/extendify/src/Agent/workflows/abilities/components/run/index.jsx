import { Generic } from '@agent/workflows/abilities/components/run/Generic';
import { OptimizeMedia } from '@agent/workflows/abilities/components/run/imagify/OptimizeMedia';
import { CreateProduct } from '@agent/workflows/abilities/components/run/woo/CreateProduct';
import { createElement } from '@wordpress/element';

const BY_ABILITY = {
	'imagify/optimize-media': OptimizeMedia,
	'woocommerce/product-create': CreateProduct,
};

export const hasRunComponent = (abilityName) => !!BY_ABILITY[abilityName];

export const AbilityRun = (props) =>
	createElement(BY_ABILITY[props.id] ?? Generic, props);
