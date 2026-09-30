<?php

/**
 * Cache data.
 */

namespace Extendify\Shared\DataProvider;

defined('ABSPATH') || die('No direct access.');

use Extendify\Constants;
use Extendify\PartnerData;
use Extendify\Shared\Services\Sanitizer;

/**
 * The product data class.
 */

class ProductsData
{
    /**
         * Gets the recommended products based on partner and current language.
         *
         * @return array
         */
    public static function get()
    {
        // Check cache before fetching.
        $products = get_transient('extendify_recommendations_products');

        // Return products from cache if not empty.
        if ($products !== false) {
            return $products;
        }

        // Otherwise fetch products.
        $response = \wp_remote_get(
            \add_query_arg(
                [
                    'disabled_products' => PartnerData::setting('productRecommendations')['disabledProducts'],
                    'custom_products' => PartnerData::setting('productRecommendations')['customProducts'],
                    'wp_language' => \get_locale(),
                ],
                Constants::DASHBOARD_HOST . '/api/recommendations/products'
            ),
            [
                'headers' => ['Accept' => 'application/json'],
            ]
        );

        if (\is_wp_error($response)) {
            return [];
        }

        $result = json_decode(\wp_remote_retrieve_body($response), true);

        if (!isset($result['success']) || !$result['success']) {
            return [];
        }

        $products = $result['data'];
        $sanitizedProducts = [];

        foreach ($products as $product) {
            // We are escaping the original price tag separately because we are using HTML tags
            // inside it and they are removed when going through the `sanitizeArray` function.
            $originalPriceTag = $product['priceTag'] ?? '';
            $sanitizedPriceTag = Sanitizer::sanitizeTextWithFormattingTags($originalPriceTag);
            $sanitizedProduct = Sanitizer::sanitizeArray($product);
            $sanitizedProduct['priceTag'] = $sanitizedPriceTag;
            $sanitizedProducts[] = $sanitizedProduct;
        }

        // Cache products.
        set_transient('extendify_recommendations_products', $sanitizedProducts, DAY_IN_SECONDS);

        return $sanitizedProducts;
    }
}
