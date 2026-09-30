<?php

namespace Extendify\QuickEdit\Services;

defined('ABSPATH') || die('No direct access.');

// Render-time identity check for a clicked block. The client reads a block's
// integer id from a render-time data attribute on the live DOM node it
// clicked; the server re-derives that id by counting the parsed post. The two
// can disagree (synced patterns, nested navs, dynamic expansion) and land on a
// different block of the same type — past the type guard. The client also
// sends a fingerprint of the block it actually clicked, and this refuses the
// save when the resolved block doesn't carry it.
//
// The fingerprint is read from the LIVE element on the client, never the
// cached block source — that source is resolved by the same count as the save,
// so it would echo a misresolve and the check would pass on the wrong block.
class BlockFingerprint
{
    // True when every field the client provided matches the resolved block.
    // Fields are independent and additive (text, service); an absent field
    // doesn't constrain the match, so a client that sends nothing fails open.
    //
    // The client reads text from the rendered DOM, so when a shortcode or other
    // the_content transform expands it differently than the stored markup, the
    // caller can pass the block's rendered HTML as an extra text candidate.
    //
    // $prefix matches when the fingerprint is only a *prefix* of the block's
    // text. A block-level shortcode render (e.g. [products] -> a <div>) can't
    // nest in a <p>, so the browser splits the paragraph and the live element's
    // text is truncated at that point — the fingerprint becomes a prefix of the
    // stored block. Used as a last-resort recovery, unique-match only.
    public static function matches(
        array $block,
        array $fingerprint,
        string $renderedText = '',
        bool $prefix = false
    ): bool {
        if (isset($fingerprint['service'])) {
            $service = (string) ($block['attrs']['service'] ?? '');
            if ($service !== (string) $fingerprint['service']) {
                return false;
            }
        }

        if (isset($fingerprint['text'])) {
            $want = self::normalize((string) $fingerprint['text']);
            // Visible text lives in attrs.label for dynamic items (nav
            // link/submenu) and in innerHTML for static text blocks (paragraph,
            // heading, button) — accept either, plus the rendered text if given.
            $candidates = [
                self::normalize((string) ($block['attrs']['label'] ?? '')),
                self::normalize(self::stripText((string) ($block['innerHTML'] ?? ''))),
            ];
            if ($renderedText !== '') {
                $candidates[] = self::normalize(self::stripText($renderedText));
            }
            $textOk = false;
            foreach ($candidates as $candidate) {
                $hit = $prefix
                    ? ($want !== '' && strncmp($candidate, $want, strlen($want)) === 0)
                    : ($candidate === $want);
                if ($hit) {
                    $textOk = true;
                    break;
                }
            }
            if (!$textOk) {
                return false;
            }
        }

        return true;
    }

    private static function stripText(string $html): string
    {
        return html_entity_decode(wp_strip_all_tags($html), ENT_QUOTES);
    }

    // Fold wptexturize's typographic substitutions back to ASCII: the client
    // reads the block's text from the rendered (texturized) DOM while this
    // fingerprints the raw stored markup, so without folding an apostrophe
    // alone ("Woody's" vs "Woody’s") falses a 409. Must stay in lockstep with
    // normalizeText in src/QuickEdit/lib/fingerprint.js.
    private static function normalize(string $value): string
    {
        $value = strtr($value, [
            "\u{2018}" => "'", "\u{2019}" => "'", "\u{201A}" => "'", "\u{201B}" => "'",
            "\u{201C}" => '"', "\u{201D}" => '"', "\u{201E}" => '"', "\u{201F}" => '"',
            "\u{2012}" => '-', "\u{2013}" => '-', "\u{2014}" => '-', "\u{2015}" => '-',
            "\u{2026}" => '...',
            "\u{00A0}" => ' ', "\u{2009}" => ' ', "\u{202F}" => ' ',
        ]);
        $value = (string) preg_replace('/-{2,}/', '-', $value);
        return trim((string) preg_replace('/\s+/', ' ', $value));
    }
}
