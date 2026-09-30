<?php

namespace Extendify\QuickEdit\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\Agent\TagBlocks;
use Extendify\Agent\TemplatePartBlockFinder;
use Extendify\Config;
use Extendify\QuickEdit\Schemas\Registry;
use Extendify\QuickEdit\Services\BlockFingerprint;
use Extendify\QuickEdit\Services\TranslatedContext;

class SaveController
{
    public static function init()
    {
        add_action('rest_api_init', [self::class, 'registerRoutes']);
    }

    public static function registerRoutes()
    {
        register_rest_route('extendify/v1', '/quick-edit/save', [
            'methods'             => 'POST',
            'permission_callback' => [self::class, 'permissionCallback'],
            'callback'            => [self::class, 'handleSave'],
        ]);

        register_rest_route('extendify/v1', '/quick-edit/schemas', [
            'methods'             => 'GET',
            'permission_callback' => [self::class, 'permissionCallback'],
            'callback'            => function () {
                return new \WP_REST_Response(Registry::describe());
            },
        ]);
    }

    public static function permissionCallback(): bool
    {
        return current_user_can(Config::$requiredCapability);
    }

    public static function handleSave(\WP_REST_Request $req)
    {
        $body       = $req->get_json_params() ?: [];
        $source     = $body['source']    ?? null;
        $blockId    = isset($body['blockId']) ? (int) $body['blockId'] : 0;
        $blockType  = isset($body['blockType']) ? (string) $body['blockType'] : '';
        $patches    = is_array($body['patches'] ?? null) ? $body['patches'] : [];
        // patches: schema-driven (image/cover). rawBlock: serialized block markup
        // from the BlockEditor text editor; bypasses schema apply.
        $rawBlock   = isset($body['rawBlock']) ? (string) $body['rawBlock'] : '';

        if (!is_array($source) || !$blockId || !$blockType || (!$patches && !$rawBlock)) {
            return new \WP_REST_Response(
                ['error' => 'source, blockId, blockType + (patches OR rawBlock) required'],
                400
            );
        }

        $schema = Registry::get($blockType);
        if (!$rawBlock && !$schema) {
            return new \WP_REST_Response(
                ['error' => 'no schema registered for block type', 'blockType' => $blockType],
                400
            );
        }

        // rawBlock bypasses schema apply and is spliced in whole, so restrict it
        // to the text blocks BlockTextEditor actually emits — otherwise an
        // arbitrary block type could be smuggled through this path.
        $rawBlockAllowed = ['core/paragraph', 'core/heading', 'core/button'];
        if ($rawBlock !== '' && !in_array($blockType, $rawBlockAllowed, true)) {
            return new \WP_REST_Response(
                ['error' => 'rawBlock not supported for this block type'],
                400
            );
        }

        // A text save rewrites the source post_content, but on a non-default-
        // language render the user is looking at the translation — writing here
        // would overwrite the source with the wrong language. The client
        // suppresses the text editor on those pages; refuse here too so the path
        // fails closed even when no fingerprint is sent. Image / layout /
        // schema-patch saves touch shared (untranslated) source and stay allowed.
        if (self::writesText($rawBlock, $patches) && self::isTranslatedRender($body)) {
            return new \WP_REST_Response([
                'error'   => 'translated_content',
                'message' => "Quick Edit can't edit translated content from a non-default-language page.",
            ], 409);
        }

        $sourcePost = self::resolveSourcePost($source);
        if (is_wp_error($sourcePost)) {
            return new \WP_REST_Response(['error' => $sourcePost->get_error_message()], 404);
        }

        // edit_posts is a coarse gate; per-source check enforces edit_theme_options
        // for template parts and edit_post on this specific id for posts.
        if (!self::userCanEditSource($sourcePost)) {
            return new \WP_REST_Response(['error' => 'forbidden for this source'], 403);
        }

        $blocks  = parse_blocks($sourcePost->post_content);
        // TagBlocks counts top-level blocks only (post-content), TagTemplateParts
        // counts every nested block in preorder — keep the two ID spaces apart
        // here or `findBlock`'s top-level walk never reaches inner template-part
        // blockIds (e.g. social-link inside core/social-links in a header).
        $maxCounter = 0;
        $visited = [];
        $found   = (($source['kind'] ?? '') === 'template-part')
            ? TemplatePartBlockFinder::find($blocks, $blockId, $maxCounter, $visited)
            : self::findBlock($blocks, $blockId);
        $fingerprint = is_array($body['fingerprint'] ?? null) ? $body['fingerprint'] : [];

        // Block ids are best-effort: TagBlocks numbers at render time while
        // findBlock re-derives at parse time, and the two diverge on synced
        // patterns, nested navs, and dynamic expansion. Accept the count-resolved
        // block only when it's the right type AND carries the clicked block's
        // fingerprint — matched against the raw markup, then the rendered block
        // so shortcodes / wptexturize line up with what the client read.
        $countOk = $found !== null
            && ($found['block']['blockName'] ?? '') === $blockType
            && (
                !$fingerprint
                || BlockFingerprint::matches($found['block'], $fingerprint)
                || BlockFingerprint::matches(
                    $found['block'],
                    $fingerprint,
                    self::renderBlockHtml($found['block'], $sourcePost)
                )
            );

        if (!$countOk && $fingerprint) {
            // The count missed or landed on the wrong block; recover by identity
            // and edit the unique block that carries the fingerprint. Ambiguous
            // (or absent) → refuse rather than overwrite an unintended block.
            $matches = self::findBlocksByFingerprint($blocks, $blockType, $fingerprint, $sourcePost);
            if (count($matches) !== 1) {
                $resp = [
                    'error'      => 'block fingerprint mismatch',
                    'blockId'    => $blockId,
                    'candidates' => count($matches),
                ];
                // Devmode-only: surface what the post actually holds so a
                // candidates:0 (text not in storage) vs ambiguous mismatch can be
                // diagnosed straight from the response.
                if (defined('EXTENDIFY_DEVMODE') && EXTENDIFY_DEVMODE) {
                    $resp['debug'] = [
                        'wanted'         => $fingerprint,
                        'countLanded'    => $found ? [
                            'name' => $found['block']['blockName'] ?? null,
                            'text' => self::debugSnippet($found['block']),
                        ] : null,
                        'sameTypeInPost' => self::collectTextsByType($blocks, $blockType),
                    ];
                }
                return new \WP_REST_Response($resp, 409);
            }
            $found = $matches[0];
        } elseif (!$countOk) {
            // No fingerprint to recover with — surface the original count failure.
            if ($found === null) {
                return new \WP_REST_Response([
                    'error'      => 'block not found in source',
                    'blockId'    => $blockId,
                    'maxCounter' => $maxCounter,
                    'sourceKind' => $source['kind'] ?? null,
                    'partSlug'   => $source['partSlug'] ?? null,
                    'visited'    => $visited,
                ], 404);
            }
            return new \WP_REST_Response([
                'error'    => 'block type mismatch',
                'expected' => $blockType,
                'actual'   => $found['block']['blockName'] ?? null,
            ], 409);
        }

        $targetBlock = $found['block'];

        if ($rawBlock !== '') {
            // From get_json_params, so never slashed — unslashing here stripped
            // the real backslashes in serialized attrs and corrupted the block.
            $parsed = parse_blocks($rawBlock);
            $parsed = array_values(array_filter(
                $parsed,
                static function ($b) {
                    return is_array($b) && !empty($b['blockName']);
                }
            ));
            if (count($parsed) !== 1) {
                return new \WP_REST_Response([
                    'error' => 'rawBlock must parse to exactly one block',
                    'parsed_count' => count($parsed),
                ], 400);
            }
            if ($parsed[0]['blockName'] !== $blockType) {
                return new \WP_REST_Response([
                    'error' => 'rawBlock type does not match blockType',
                    'expected' => $blockType,
                    'got' => $parsed[0]['blockName'],
                ], 400);
            }
            // kses the parsed innerHTML in place so both the persisted content
            // and the re-rendered HTML echoed back below are sanitized, not just
            // what wp_update_post stores for non-unfiltered_html users.
            $inner = wp_kses_post($parsed[0]['innerHTML'] ?? '');
            if ($blockType === 'core/paragraph') {
                $inner = self::syncTelLink($inner);
            }
            $parsed[0]['innerHTML']    = $inner;
            $parsed[0]['innerContent'] = [$inner];
            $targetBlock = $parsed[0];
        } else {
            // Patch order matters: some schemas cross-refer to innerHTML
            // so text-then-align differs from align-then-text.
            foreach ($patches as $patch) {
                if (!is_array($patch)) {
                    continue;
                }
                $fieldKey = (string) ($patch['fieldKey'] ?? '');
                if ($fieldKey === '') {
                    continue;
                }
                $targetBlock = $schema->apply($targetBlock, $fieldKey, $patch['value'] ?? null);
            }
        }

        $blocks      = self::replaceBlockAtPath($blocks, $found['path'], $targetBlock);
        $newContent  = serialize_blocks($blocks);

        $update = wp_update_post([
            'ID'           => $sourcePost->ID,
            'post_content' => wp_slash($newContent),
        ], true);
        if (is_wp_error($update)) {
            return new \WP_REST_Response(['error' => $update->get_error_message()], 500);
        }

        // Re-render via the same filter chain a live page uses. Counter classes
        // start at 1 here; client splices via patchVariantClasses to align them.
        $rendered = self::renderBlockHtml($targetBlock, $sourcePost);

        return new \WP_REST_Response([
            'ok'        => true,
            'blockId'   => $blockId,
            'blockType' => $blockType,
            'rendered'  => trim($rendered),
        ]);
    }

    // Whether the save edits translatable text: the rawBlock text-editor path is
    // always text, and the schema-patch path is text only for the content / text
    // fields (align / image / url / service / level are shared, untranslated).
    private static function writesText(string $rawBlock, array $patches): bool
    {
        if ($rawBlock !== '') {
            return true;
        }
        foreach ($patches as $patch) {
            if (is_array($patch) && in_array((string) ($patch['fieldKey'] ?? ''), ['content', 'text'], true)) {
                return true;
            }
        }
        return false;
    }

    // Keep a phone CTA dialing the number the user can see. When a saved
    // paragraph's content is a single <a href="tel:…"> link, re-point the
    // anchor's href + data-id at the normalized digits of its visible text and
    // pin data-type="tel". Editing the digits in RichText keeps the link format
    // but only swaps the text, leaving href on the number the link was first
    // built with — without this, tap-to-call dials the stale number.
    //
    // Scoped narrowly: only a lone tel: anchor is touched. http/mailto links,
    // multi-link paragraphs, no link, or text that yields no usable number are
    // returned unchanged, so an ordinary paragraph's link is never rewritten.
    // Runs after wp_kses_post; the value written (a tel: URI of digits and an
    // optional leading +) needs no further sanitizing.
    private static function syncTelLink(string $innerHtml): string
    {
        if (stripos($innerHtml, '<a') === false || stripos($innerHtml, 'tel:') === false) {
            return $innerHtml;
        }

        $dom = new \DOMDocument();
        $previous = libxml_use_internal_errors(true);
        // The encoding hint stops DOMDocument mangling UTF-8; the flags keep it
        // from wrapping the fragment in <html>/<body>.
        $loaded = $dom->loadHTML(
            '<?xml encoding="utf-8"?>' . $innerHtml,
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        if (!$loaded) {
            return $innerHtml;
        }

        $anchors = $dom->getElementsByTagName('a');
        if ($anchors->length !== 1) {
            return $innerHtml;
        }
        $anchor = $anchors->item(0);
        if (stripos((string) $anchor->getAttribute('href'), 'tel:') !== 0) {
            return $innerHtml;
        }

        $normalized = self::normalizePhoneNumber($anchor->textContent);
        if ($normalized === null) {
            return $innerHtml;
        }
        $newHref = 'tel:' . $normalized;

        // Rewrite the single anchor's opening tag only — the <p> wrapper and the
        // link text stay byte-for-byte intact.
        return preg_replace_callback(
            '/<a\b[^>]*>/i',
            static function ($match) use ($newHref) {
                return self::setTagAttributes($match[0], [
                    'href'      => $newHref,
                    'data-id'   => $newHref,
                    'data-type' => 'tel',
                ]);
            },
            $innerHtml,
            1
        );
    }

    // Reduce visible phone text to bare dialable digits: keep a single leading
    // + (international prefix) and drop spaces / dashes / parens / other visual
    // separators. Returns null when the result isn't a plausible phone number
    // (E.164 caps at 15 digits) so the caller leaves the href untouched rather
    // than writing a broken tel: link.
    private static function normalizePhoneNumber(string $text)
    {
        $text   = trim($text);
        $plus   = (strncmp($text, '+', 1) === 0) ? '+' : '';
        $digits = (string) preg_replace('/\D+/', '', $text);
        $length = strlen($digits);
        if ($length < 7 || $length > 15) {
            return null;
        }
        return $plus . $digits;
    }

    // Set attributes within a single opening-tag string: replace an existing
    // attribute's value in place, otherwise inject it before the closing '>'.
    private static function setTagAttributes(string $tag, array $attributes): string
    {
        foreach ($attributes as $name => $value) {
            $rendered = ' ' . $name . '="' . esc_attr($value) . '"';
            $pattern  = '/\s' . preg_quote($name, '/') . '\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i';
            $tag = preg_match($pattern, $tag)
                ? preg_replace($pattern, $rendered, $tag, 1)
                : preg_replace('/\s*\/?>$/', $rendered . '>', $tag, 1);
        }
        return $tag;
    }

    // The REST save request isn't language-scoped the way the page render is, so
    // trust the translatedContext the client forwards (detected at enqueue); also
    // re-check server-side in case this request is language-scoped on its own.
    private static function isTranslatedRender(array $body): bool
    {
        $clientContext = $body['translatedContext'] ?? null;
        if (is_array($clientContext) && !empty($clientContext['isTranslated'])) {
            return true;
        }
        return !empty(TranslatedContext::detect()['isTranslated']);
    }

    // Render a single block through the same the_content chain a live page uses
    // (expanding shortcodes, wptexturize, etc.). In a REST request the main
    // query has no post, so wp_reset_postdata() can't restore $GLOBALS['post'] —
    // snapshot and restore it so a template-part save can't leave global $post
    // dangling for the rest of the request.
    private static function renderBlockHtml(array $block, \WP_Post $sourcePost): string
    {
        $previousPost = $GLOBALS['post'] ?? null;
        $GLOBALS['post'] = $sourcePost;
        setup_postdata($sourcePost);
        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- core WP filter
        $html = apply_filters('the_content', serialize_blocks([$block]));
        wp_reset_postdata();
        $GLOBALS['post'] = $previousPost;
        return (string) $html;
    }

    // Every block of $blockType that carries the fingerprint, with its path.
    // The caller only proceeds on a *unique* match — two blocks with the same
    // content can't be told apart, so that refuses rather than guesses. Skips
    // ignored dynamic loops and nested template-part scopes. Tries the cheap
    // raw/fold match across candidates first and only renders (expanding
    // shortcodes etc.) if nothing matched raw.
    private static function findBlocksByFingerprint(
        array $blocks,
        string $blockType,
        array $fingerprint,
        \WP_Post $sourcePost
    ): array {
        $ignored = TagBlocks::$ignored;
        $candidates = [];
        $walk = function (array $list, array $pathSoFar) use (&$walk, &$candidates, $blockType, $ignored) {
            foreach ($list as $i => $block) {
                $name = $block['blockName'] ?? '';
                if ($name === '') {
                    if (!empty($block['innerBlocks'])) {
                        $walk($block['innerBlocks'], array_merge($pathSoFar, [$i, 'innerBlocks']));
                    }
                    continue;
                }
                if ($name === 'core/template-part' || in_array($name, $ignored, true)) {
                    continue;
                }
                if ($name === $blockType) {
                    $candidates[] = ['block' => $block, 'path' => array_merge($pathSoFar, [$i])];
                }
                if (!empty($block['innerBlocks'])) {
                    $walk($block['innerBlocks'], array_merge($pathSoFar, [$i, 'innerBlocks']));
                }
            }
        };
        $walk($blocks, []);

        $raw = array_values(array_filter(
            $candidates,
            static function ($c) use ($fingerprint) {
                return BlockFingerprint::matches($c['block'], $fingerprint);
            }
        ));
        if ($raw) {
            return $raw;
        }

        $rendered = array_values(array_filter(
            $candidates,
            static function ($c) use ($fingerprint, $sourcePost) {
                return BlockFingerprint::matches(
                    $c['block'],
                    $fingerprint,
                    self::renderBlockHtml($c['block'], $sourcePost)
                );
            }
        ));
        if ($rendered) {
            return $rendered;
        }

        // Last resort: a block-level shortcode render (e.g. [products]) splits
        // the paragraph in the browser, so the live element's text — and thus
        // the fingerprint — is truncated to a prefix of the stored block.
        return array_values(array_filter(
            $candidates,
            static function ($c) use ($fingerprint) {
                return BlockFingerprint::matches($c['block'], $fingerprint, '', true);
            }
        ));
    }

    private static function debugSnippet(array $block): string
    {
        return mb_substr(trim((string) wp_strip_all_tags((string) ($block['innerHTML'] ?? ''))), 0, 80);
    }

    // Devmode diagnostics: the raw text of every block of $blockType in the
    // post, so a fingerprint mismatch can be compared against what's stored.
    private static function collectTextsByType(array $blocks, string $blockType): array
    {
        $out = [];
        $ignored = TagBlocks::$ignored;
        $walk = function (array $list) use (&$walk, &$out, $blockType, $ignored) {
            foreach ($list as $block) {
                $name = $block['blockName'] ?? '';
                if ($name === '') {
                    if (!empty($block['innerBlocks'])) {
                        $walk($block['innerBlocks']);
                    }
                    continue;
                }
                if ($name === 'core/template-part' || in_array($name, $ignored, true)) {
                    continue;
                }
                if ($name === $blockType) {
                    $out[] = self::debugSnippet($block);
                }
                if (!empty($block['innerBlocks'])) {
                    $walk($block['innerBlocks']);
                }
            }
        };
        $walk($blocks);
        return $out;
    }

    /**
     * @return \WP_Post|\WP_Error
     */
    private static function resolveSourcePost(array $source)
    {
        $kind = (string) ($source['kind'] ?? '');

        if ($kind === 'post') {
            $id = (int) ($source['id'] ?? 0);
            $post = $id ? get_post($id) : null;
            if (!$post) {
                return new \WP_Error('not_found', 'post not found');
            }
            $disallowed = ['revision', 'wp_navigation', 'wp_template',
                           'wp_template_part', 'wp_block', 'attachment'];
            if (
                in_array($post->post_type, $disallowed, true)
                || $post->post_status === 'auto-draft'
            ) {
                return new \WP_Error(
                    'post_type_not_supported',
                    'Edit this content via its dedicated endpoint'
                );
            }
            return $post;
        }

        if ($kind === 'template-part') {
            $slug = (string) ($source['partSlug'] ?? '');
            if ($slug === '') {
                return new \WP_Error('bad_source', 'template-part requires partSlug');
            }
            // Use WP's own resolver so the save lands on the post WP renders
            // from. Raw get_posts by name returns rows from every wp_theme
            // term — when an install has had multiple theme variants active
            // at different times (e.g. `extendable` and `extendable-2` both
            // owning a "header" post), the wrong row wins on post_date
            // ordering and we patch a stale orphan instead of the live part.
            $stylesheet = wp_get_theme()->get_stylesheet();
            $template = get_block_template("{$stylesheet}//{$slug}", 'wp_template_part');
            if (!$template || empty($template->wp_id)) {
                return new \WP_Error('not_found', 'template-part not found');
            }
            $post = get_post($template->wp_id);
            if (!$post) {
                return new \WP_Error('not_found', 'template-part not found');
            }
            return $post;
        }

        return new \WP_Error('bad_source', 'unknown source kind');
    }

    private static function userCanEditSource(\WP_Post $post): bool
    {
        if ($post->post_type === 'wp_template_part') {
            return current_user_can('edit_theme_options');
        }
        return current_user_can('edit_post', $post->ID);
    }

    // Walks the parsed-block tree the same way TagBlocks counts on the front-end
    // so client blockIds line up with what the server resolves.
    private static function findBlock(array $blocks, int $targetId)
    {
        $ignored = TagBlocks::$ignored;
        $counter = 0;
        $found   = null;

        $walk = function (array &$list, array $pathSoFar, int $skipDepth)
 use (&$walk, &$counter, &$found, $targetId, $ignored) {
            foreach ($list as $i => &$block) {
                if (empty($block['blockName'])) {
                    if (!empty($block['innerBlocks'])) {
                        $walk($block['innerBlocks'], array_merge($pathSoFar, [$i, 'innerBlocks']), $skipDepth);
                        if ($found !== null) {
                            return;
                        }
                    }
                    continue;
                }
                $isIgnored = in_array($block['blockName'], $ignored, true);
                if ($isIgnored || $skipDepth > 0) {
                    if (!empty($block['innerBlocks'])) {
                        $walk(
                            $block['innerBlocks'],
                            array_merge($pathSoFar, [$i, 'innerBlocks']),
                            $skipDepth + ($isIgnored ? 1 : 0)
                        );
                        if ($found !== null) {
                            return;
                        }
                    }
                    continue;
                }
                $counter++;
                if ($counter === $targetId) {
                    $found = ['block' => $block, 'path' => array_merge($pathSoFar, [$i])];
                    return;
                }
                if (!empty($block['innerBlocks'])) {
                    $walk($block['innerBlocks'], array_merge($pathSoFar, [$i, 'innerBlocks']), 0);
                    if ($found !== null) {
                        return;
                    }
                }
            }
            unset($block);
        };
        $walk($blocks, [], 0);

        return $found;
    }

    // Path elements alternate index / 'innerBlocks' / index / 'innerBlocks' / ...
    private static function replaceBlockAtPath(array $blocks, array $path, array $newBlock): array
    {
        if (empty($path)) {
            return $blocks;
        }
        $head = $path[0];
        $rest = array_slice($path, 1);
        if (!is_int($head) || !isset($blocks[$head])) {
            return $blocks;
        }
        if (empty($rest)) {
            $blocks[$head] = $newBlock;
            return $blocks;
        }
        if ($rest[0] === 'innerBlocks') {
            $blocks[$head]['innerBlocks'] = self::replaceBlockAtPath(
                $blocks[$head]['innerBlocks'] ?? [],
                array_slice($rest, 1),
                $newBlock
            );
        }
        return $blocks;
    }
}
