<?php

namespace Extendify\Agent\Controllers;

defined('ABSPATH') || die('No direct access.');

class ContentController
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    // Header and footer text lives in a template part, a synced pattern's in a wp_block.
    const POST_TYPES = ['post', 'page', 'wp_template_part', 'wp_block'];

    const FORMATS = ['text', 'blocks', 'excerpt'];

    const MAX_SCANNED = 100;

    const MAX_POSTS = 25;

    const MAX_MATCHES = 3;

    const MAX_CONTEXT = 300;

    const MAX_CONTENT = 15000;

    const MAX_BYTES = 20000;

    const MAX_META_KEYS = 50;

    const MAX_META_VALUE = 500;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * @param \WP_REST_Request $request The REST API request object.
     * @return \WP_REST_Response
     */
    public static function search(\WP_REST_Request $request)
    {
        $params = self::params($request);
        $query = trim(self::text($params, 'query'));
        if ($query === '') {
            return self::reject('query must say what to look for');
        }

        $types = self::types($params);
        if (!$types) {
            return self::reject('postTypes names no post type this site has');
        }

        $limit = self::number($params, 'limit', 10, self::MAX_POSTS);
        $context = self::number($params, 'context', 60, self::MAX_CONTEXT);
        $candidates = new \WP_Query([
            'post_type' => $types,
            'post_status' => 'publish',
            'posts_per_page' => self::MAX_SCANNED,
            'orderby' => 'modified',
            'order' => 'DESC',
            'ignore_sticky_posts' => true,
        ]);

        $results = [];
        $matched = 0;
        $spent = 0;
        foreach ($candidates->posts as $post) {
            $found = self::snippets(self::rendered($post), $query, $context);
            if (!$found['matches']) {
                continue;
            }

            $matched++;
            if (count($results) >= $limit || $spent > self::MAX_BYTES) {
                continue;
            }

            $result = [
                'id' => (int) $post->ID,
                'type' => $post->post_type,
                'title' => self::decoded($post->post_title),
                'slug' => $post->post_name,
                'matches' => $found['matches'],
                'moreMatches' => $found['count'] - count($found['matches']),
            ];
            // Escaped JSON counts one Japanese character as six, spending the budget six times over.
            $spent += strlen((string) wp_json_encode($result, JSON_UNESCAPED_UNICODE));
            $results[] = $result;
        }

        $response = [
            'query' => $query,
            'scanned' => count($candidates->posts),
            'matched' => $matched,
            'results' => $results,
        ];
        $left = self::leftOut($matched - count($results), (int) $candidates->found_posts - count($candidates->posts));
        if ($left !== '') {
            $response['truncated'] = $left;
        }

        return new \WP_REST_Response($response);
    }

    /**
     * @param \WP_REST_Request $request The REST API request object.
     * @return \WP_REST_Response
     */
    public static function read(\WP_REST_Request $request)
    {
        $params = self::params($request);
        $id = self::number($params, 'id', 0, PHP_INT_MAX);
        $slug = trim(self::text($params, 'slug'));
        if (!$id && $slug === '') {
            return self::reject('id or slug must say what to read');
        }

        $format = self::text($params, 'format', 'text');
        if (!in_array($format, self::FORMATS, true)) {
            return self::reject('format must be one of ' . implode(', ', self::FORMATS));
        }

        $post = $id ? self::byId($id) : self::bySlug($slug);
        if (!$post) {
            return self::reject('Nothing readable was found for ' . ($id ? $id : $slug));
        }

        $content = self::content($post, $format);
        $response = [
            'id' => (int) $post->ID,
            'type' => $post->post_type,
            'title' => self::decoded($post->post_title),
            'slug' => $post->post_name,
            'status' => $post->post_status,
            'date' => $post->post_date,
            'format' => $format,
            'content' => mb_substr($content, 0, self::MAX_CONTENT),
        ];
        if (mb_strlen($content) > self::MAX_CONTENT) {
            $response['truncated'] = 'Cut after ' . self::MAX_CONTENT . ' characters, of '
                . mb_strlen($content) . ' the post holds.';
        }
        if (!empty($params['includeMeta'])) {
            $response['meta'] = self::meta($post->ID);
        }

        return new \WP_REST_Response($response);
    }

    /**
     * @param \WP_REST_Request $request The REST API request object.
     * @return array The request body.
     */
    private static function params(\WP_REST_Request $request)
    {
        $params = $request->get_json_params();

        return is_array($params) ? $params : [];
    }

    /**
     * @param string $message What the caller has to change.
     * @return \WP_REST_Response
     */
    private static function reject($message)
    {
        return new \WP_REST_Response(['error' => $message], 400);
    }

    /**
     * @param array  $params  The array to read from.
     * @param string $key     The key to read.
     * @param string $default What to use when the key is absent.
     * @return string
     */
    private static function text($params, $key, $default = '')
    {
        return isset($params[$key]) && is_string($params[$key]) ? $params[$key] : $default;
    }

    /**
     * @param array   $params  The array to read from.
     * @param string  $key     The key to read.
     * @param integer $default What to use when the key is absent.
     * @param integer $most    The largest value to allow.
     * @return integer
     */
    private static function number($params, $key, $default, $most)
    {
        $value = isset($params[$key]) && is_numeric($params[$key])
            ? (int) $params[$key]
            : $default;

        return max(0, min($value, $most));
    }

    /**
     * @param array $params The request body.
     * @return array The post types to search through.
     */
    private static function types($params)
    {
        $requested = isset($params['postTypes']) && is_array($params['postTypes'])
            ? $params['postTypes']
            : [];
        if (!$requested) {
            return self::POST_TYPES;
        }

        return array_values(array_filter($requested, function ($type) {
            return is_string($type) && post_type_exists($type);
        }));
    }

    /**
     * An empty result and one nobody looked for read the same to a model.
     *
     * @param integer $matched   Matching posts the response left out.
     * @param integer $unscanned Candidates the scan never reached.
     * @return string
     */
    private static function leftOut($matched, $unscanned)
    {
        $left = [];
        if ($matched > 0) {
            $left[] = $matched . ' more posts matched';
        }
        if ($unscanned > 0) {
            $left[] = $unscanned . ' posts were not searched';
        }

        return $left ? implode(', and ', $left) . '.' : '';
    }

    /**
     * Blocks that read the post they sit in render empty without the global.
     *
     * @param \WP_Post $post The post to render.
     * @return string Its text as a visitor reads it.
     */
    private static function rendered($post)
    {
        $GLOBALS['post'] = $post;
        setup_postdata($post);
        $html = do_shortcode(do_blocks($post->post_content));
        wp_reset_postdata();

        return trim(preg_replace('/\s+/u', ' ', self::decoded(wp_strip_all_tags($html))));
    }

    /**
     * @param string $text Text as WordPress stored or rendered it.
     * @return string
     */
    private static function decoded($text)
    {
        return html_entity_decode($text, ENT_QUOTES, get_bloginfo('charset'));
    }

    /**
     * @param string  $text    The text to look through.
     * @param string  $query   What to look for.
     * @param integer $context How much to quote either side of a match.
     * @return array The snippets, and how many times the text says it.
     */
    private static function snippets($text, $query, $context)
    {
        // Turkish İ lower cases to two characters, so a folded copy's offsets miss the match.
        $pattern = '/' . preg_quote($query, '/') . '/iu';
        if (!preg_match_all($pattern, $text, $found, PREG_OFFSET_CAPTURE)) {
            return ['matches' => [], 'count' => 0];
        }

        $end = strlen($text);
        $matches = [];
        $quoted = 0;
        foreach ($found[0] as $occurrence) {
            list($match, $at) = $occurrence;
            if (count($matches) >= self::MAX_MATCHES || $at < $quoted) {
                continue;
            }

            $before = self::quoteBefore($text, $at, $context);
            $after = self::quoteAfter($text, $at + strlen($match), $context);
            $quoted = $at + strlen($match) + strlen($after);
            $matches[] = ($at > strlen($before) ? '…' : '')
                . $before . $match . $after
                . ($quoted < $end ? '…' : '');
        }

        return ['matches' => $matches, 'count' => count($found[0])];
    }

    /**
     * Up to $context characters of $text ending at byte offset $at.
     *
     * @param string  $text    The text a match was found in.
     * @param integer $at      Where the match begins, in bytes.
     * @param integer $context How many characters to quote.
     * @return string
     */
    private static function quoteBefore($text, $at, $context)
    {
        // A character is at most four bytes, so the window always holds enough.
        $slice = substr($text, max(0, $at - (4 * $context)), min($at, 4 * $context));
        // A slice starting mid-character would fail the /u match and empty the quote.
        $slice = (string) preg_replace('/^[\x80-\xBF]+/', '', $slice);
        preg_match('/.{0,' . $context . '}$/su', $slice, $match);

        return $match[0] ?? '';
    }

    /**
     * Up to $context characters of $text starting at byte offset $at.
     *
     * @param string  $text    The text a match was found in.
     * @param integer $at      Where the match ends, in bytes.
     * @param integer $context How many characters to quote.
     * @return string
     */
    private static function quoteAfter($text, $at, $context)
    {
        // A slice ending mid-character would fail the /u match and empty the quote.
        $slice = (string) preg_replace(
            '/(?:[\xC2-\xDF]|[\xE0-\xEF][\x80-\xBF]?|[\xF0-\xF4][\x80-\xBF]{0,2})$/D',
            '',
            substr($text, $at, 4 * $context)
        );
        preg_match('/^.{0,' . $context . '}/su', $slice, $match);

        return $match[0] ?? '';
    }

    /**
     * @param integer $id A post id.
     * @return \WP_Post|null
     */
    private static function byId($id)
    {
        $post = get_post($id);
        if (!$post || in_array($post->post_status, ['auto-draft', 'trash'], true)) {
            return null;
        }

        return $post;
    }

    /**
     * @param string $slug A post slug.
     * @return \WP_Post|null
     */
    private static function bySlug($slug)
    {
        $posts = get_posts([
            'name' => $slug,
            'post_type' => self::POST_TYPES,
            'post_status' => 'any',
            'posts_per_page' => 1,
        ]);

        return $posts ? $posts[0] : null;
    }

    /**
     * @param \WP_Post $post   The post being read.
     * @param string   $format Which of self::FORMATS to return.
     * @return string
     */
    private static function content($post, $format)
    {
        if ($format === 'blocks') {
            return $post->post_content;
        }

        if ($format === 'excerpt') {
            return get_the_excerpt($post);
        }

        return self::rendered($post);
    }

    /**
     * Keys under an underscore are WordPress and plugin bookkeeping.
     *
     * @param integer $id The post to read meta from.
     * @return array Name => value pairs.
     */
    private static function meta($id)
    {
        $meta = [];
        foreach (get_post_meta($id) as $key => $stored) {
            if (strpos($key, '_') === 0 || count($meta) >= self::MAX_META_KEYS) {
                continue;
            }

            $value = maybe_unserialize(isset($stored[0]) ? $stored[0] : '');
            $meta[$key] = is_string($value) && mb_strlen($value) > self::MAX_META_VALUE
                ? mb_substr($value, 0, self::MAX_META_VALUE)
                : $value;
        }

        return $meta;
    }
}
