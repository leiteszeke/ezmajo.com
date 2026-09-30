<?php

/**
 * Placeholder rail for the deferred docked-left agent.
 */

namespace Extendify\Agent;

defined('ABSPATH') || die('No direct access.');

use Extendify\PartnerData;

/**
 * Prints the sidebar's chrome and puts the page content where SidebarLayout's
 * useLayoutShift will put it, so the deferred agent mounting a beat after
 * render doesn't move the page under the reader. The markup mirrors
 * SidebarLayout and ChatInput; the agent stylesheet ships at render, so those
 * class strings style it. Boot drops all of it once the panel commits.
 */
class Skeleton
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    // Mirrors SidebarLayout's SIDEBAR_WIDTH / FRAME_WIDTH / translateY;
    // drift shows up as a jump on mount.
    const WIDTH = 384;
    const FRAME = 8;
    const TOP = 40;

    // The global store seeds isMobile from this width, and MobileLayout
    // offsets nothing.
    const DESKTOP = 783;

    // Shorter than this and a warm cache turns the rail into a flash.
    const MIN_VISIBLE = 1500;

    // phpcs:disable Generic.Files.LineLength.TooLong -- inline SVG paths
    // src/Agent/icons.jsx `magic`, which AdminBar renders at 20px.
    const MAGIC_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">'
        . '<path d="M17.0909 9.81818L18 7.81818L20 6.90909L18 6L17.0909 4L16.1818 6L14.1818 6.90909L16.1818 7.81818L17.0909 9.81818Z" fill="currentColor"/>'
        . '<path d="M17.0909 14.1818L16.1818 16.1818L14.1818 17.0909L16.1818 18L17.0909 20L18 18L20 17.0909L18 16.1818L17.0909 14.1818Z" fill="currentColor"/>'
        . '<path d="M11.6364 10.1818L9.81818 6.18182L8 10.1818L4 12L8 13.8182L9.81818 17.8182L11.6364 13.8182L15.6364 12L11.6364 10.1818ZM10.5382 12.72L9.81818 14.3055L9.09818 12.72L7.51273 12L9.09818 11.28L9.81818 9.69455L10.5382 11.28L12.1236 12L10.5382 12.72Z" fill="currentColor"/>'
        . '</svg>';
    // phpcs:enable Generic.Files.LineLength.TooLong
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * admin_bar_menu fires on template_redirect, too late to gate at hook time.
     *
     * @return void
     */
    public static function initAdminBar()
    {
        // Core's wp-logo node is priority 10, and QuickEdit's toggle rides at 5.
        \add_action('admin_bar_menu', [self::class, 'addAgentButton'], 4);
    }

    /**
     * @param \WP_Admin_Bar $bar - The bar being built.
     *
     * @return void
     */
    public static function addAgentButton($bar)
    {
        if (!self::shouldRender() || !\is_user_logged_in()) {
            return;
        }

        // buttons.js renders into this same node, so it must not move.
        $bar->add_node([
            'id' => 'extendify-agent-btn',
            'title' => '<button type="button" class="ext-skeleton-agent-pill" disabled aria-busy="true">'
                . self::MAGIC_ICON
                . '<span>' . \esc_html__('AI Agent', 'extendify-local') . '</span>'
                . '</button>',
            'meta' => ['class' => 'extendify-agent'],
        ]);
    }

    /**
     * @return bool
     */
    protected static function shouldRender()
    {
        return \wp_is_block_theme()
            && !\is_customize_preview()
            && Admin::agentPosition() === 'docked-left';
    }

    /**
     * @return void
     */
    public static function init()
    {
        // agentPosition needs the query, which the constructor is too early for.
        \add_action('wp_head', [self::class, 'printStyles'], 20);
        \add_action('wp_body_open', [self::class, 'printRail'], 1);
        self::initAdminBar();
    }

    /**
     * @return void
     */
    public static function printStyles()
    {
        if (!self::shouldRender()) {
            return;
        }

        // phpcs:disable Generic.Files.LineLength.TooLong -- CSS template
        ?>
        <style id="extendify-agent-skeleton-styles">
            #extendify-agent-skeleton, #extendify-agent-skeleton-frame { display: none; }
            @media (min-width: <?php echo (int) self::DESKTOP; ?>px) {
                /* useLayoutShift takes body out of flow, so core's admin-bar
                   html margin disappears. */
                html.extendify-agent-skeleton { margin-top: 0 !important; }
                /* tan(atan2()) is the only way to divide two lengths in CSS. */
                .extendify-agent-skeleton .wp-site-blocks {
                    transform-origin: top left;
                    transform: translateX(<?php echo (int) self::WIDTH; ?>px) translateY(<?php echo (int) self::TOP; ?>px) scale(tan(atan2(calc(100vw - <?php echo (int) self::WIDTH; ?>px), 100vw)));
                }
                .extendify-agent-skeleton #wpadminbar {
                    margin: <?php echo (int) self::FRAME; ?>px <?php echo (int) self::FRAME; ?>px 0 <?php echo (int) self::WIDTH; ?>px;
                    max-width: calc(100% - <?php echo (int) (self::WIDTH + self::FRAME); ?>px);
                    border-radius: <?php echo (int) self::FRAME; ?>px <?php echo (int) self::FRAME; ?>px 0 0;
                }
                .extendify-agent-skeleton #extendify-agent-skeleton-frame {
                    display: block;
                    position: fixed;
                    top: <?php echo (int) self::FRAME; ?>px;
                    right: <?php echo (int) self::FRAME; ?>px;
                    bottom: calc(<?php echo (int) self::FRAME; ?>px + var(--extendify-notification-bar-height, 0px));
                    left: <?php echo (int) self::WIDTH; ?>px;
                    border-radius: 1rem;
                    box-shadow: 0 20px 25px -5px #0000001a, 0 8px 10px -6px #0000001a, #e0e0e0 0 0 0 9999px;
                    /* Unclipped, the 9999px shadow covers the notification bar. */
                    clip-path: inset(-9999px -9999px -<?php echo (int) self::FRAME; ?>px -9999px);
                    pointer-events: none;
                    z-index: 100000;
                }
                .extendify-agent-skeleton #extendify-agent-skeleton {
                    display: block;
                    position: fixed;
                    top: 0;
                    bottom: var(--extendify-notification-bar-height, 0px);
                    left: 0;
                    width: <?php echo (int) self::WIDTH; ?>px;
                    padding: <?php echo (int) self::FRAME; ?>px;
                    box-sizing: border-box;
                    pointer-events: none;
                    /* Underneath the mounted sidebar a held rail would never be seen. */
                    z-index: 1000001;
                }
                /* Only what the mirrored markup has no class for. */
                #extendify-agent-skeleton .ext-skeleton-icon { height: 24px; width: 24px; }
                #extendify-agent-skeleton textarea { pointer-events: none; }
                #extendify-agent-skeleton .ext-skeleton-bars {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    height: 20px;
                }
                #extendify-agent-skeleton .ext-skeleton-bars span {
                    width: 4px;
                    height: 6px;
                    border-radius: 2px;
                    background: #9ca3af;
                    animation: ext-skeleton-bars 1.1s ease-in-out infinite;
                }
                #extendify-agent-skeleton .ext-skeleton-bars span:nth-child(2) { animation-delay: 0.15s; }
                #extendify-agent-skeleton .ext-skeleton-bars span:nth-child(3) { animation-delay: 0.3s; }
                @keyframes ext-skeleton-bars {
                    0%, 100% { height: 6px; opacity: 0.45; }
                    50% { height: 20px; opacity: 1; }
                }
                @media (prefers-reduced-motion: reduce) {
                    #extendify-agent-skeleton .ext-skeleton-bars span { height: 12px; animation: none; }
                }
            }
            /* Keeping these after the real button lands would clip it to the 4px stub. */
            #wpadminbar #wp-admin-bar-extendify-agent-btn:has(.ext-skeleton-agent-pill):not(:has(button:not(.ext-skeleton-agent-pill))) {
                height: 1.75rem;
                margin-inline-end: 4px;
            }
            /* Matches the 4px stub an open panel leaves; dropping it slides the bar 8px. */
            html.extendify-agent-skeleton #wpadminbar #wp-admin-bar-extendify-agent-btn:has(.ext-skeleton-agent-pill):not(:has(button:not(.ext-skeleton-agent-pill))) {
                width: 4px;
                overflow: hidden;
            }
            #wpadminbar #wp-admin-bar-extendify-agent-btn:has(button:not(.ext-skeleton-agent-pill)) > .ab-item { display: none; }
            /* Sidestep core's .ab-item padding rather than unwinding it. */
            #wpadminbar #wp-admin-bar-extendify-agent-btn > .ab-item { display: contents; }
            #wpadminbar #wp-admin-bar-extendify-agent-btn .ext-skeleton-agent-pill {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                height: 24px;
                margin: 4px 8px 4px 4px;
                padding: 0 10px;
                border: 0;
                border-radius: 4px;
                background: #3858e9;
                color: #fff;
                font-family: inherit;
                font-size: 13px;
                line-height: 1;
                opacity: 0.6;
            }
            @media (max-width: <?php echo (int) (self::DESKTOP - 1); ?>px) {
                #wpadminbar #wp-admin-bar-extendify-agent-btn:has(.ext-skeleton-agent-pill):not(:has(button:not(.ext-skeleton-agent-pill))) { display: none; }
            }
        </style>
        <?php
        // phpcs:enable Generic.Files.LineLength.TooLong
        self::printGate();
    }

    /**
     * The store persists `open` per site in localStorage, so a closed panel is
     * invisible server-side — and offsetting for one that mounts closed is the
     * jump this class exists to avoid.
     *
     * @return void
     */
    protected static function printGate()
    {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $forced = isset($_GET['extendify-launch-success']) || isset($_GET['extendify-open-agent']);
        $siteId = \get_option('extendify_site_id', '');
        $script = sprintf(
            'try{var r=document.documentElement;'
                . 'var s=%1$s?null:JSON.parse(localStorage.getItem(%2$s));'
                . 'if(!s||!s.state||s.state.open!==false){'
                . 'r.classList.add("extendify-agent-skeleton")}'
                . 'var q=JSON.parse(localStorage.getItem(%3$s));'
                . 'if(q&&q.state&&q.state.on){r.classList.add("extendify-quick-edit-on")}'
                // Left on, it re-offsets the page when the panel closes and clears its styles.
                . 'var t=Date.now();'
                . 'var d=function(){r.classList.remove("extendify-agent-skeleton");'
                . 'var a=document.getElementById("extendify-agent-skeleton");if(a){a.remove()}'
                . 'var b=document.getElementById("extendify-agent-skeleton-frame");if(b){b.remove()}};'
                . 'var i=setInterval(function(){'
                . 'if(!document.getElementById("extendify-agent-sidebar")){return}'
                . 'clearInterval(i);setTimeout(d,Math.max(0,%4$d-(Date.now()-t)))},50);'
                . 'setTimeout(function(){clearInterval(i);d()},10000)}catch(e){}',
            $forced ? 'true' : 'false',
            \wp_json_encode('extendify-agent-global-' . $siteId),
            \wp_json_encode('extendify-quick-edit-mode-' . $siteId),
            self::MIN_VISIBLE
        );

        \wp_print_inline_script_tag($script, ['id' => 'extendify-agent-skeleton-gate']);
    }

    /**
     * @return void
     */
    public static function printRail()
    {
        if (!self::shouldRender()) {
            return;
        }

        // phpcs:disable Generic.Files.LineLength.TooLong -- class strings copied verbatim
        ?>
        <div id="extendify-agent-skeleton-frame" aria-hidden="true"></div>
        <div id="extendify-agent-skeleton" class="extendify-agent" aria-hidden="true">
            <div class="h-full flex flex-col shadow-lg rounded-2xl overflow-hidden bg-white">
                <div class="group flex shrink-0 items-center justify-between overflow-hidden bg-banner-main text-banner-text">
                    <div class="flex h-full grow items-center justify-between gap-1 p-0 py-2.5">
                        <div class="flex h-5 px-4 max-w-36 overflow-hidden">
                            <img class="max-h-full max-w-full object-contain" src="<?php echo \esc_url(PartnerData::$logo); ?>" alt="<?php echo \esc_attr(PartnerData::$name); ?>" />
                        </div>
                    </div>
                    <div class="flex gap-1 h-full items-center p-2">
                        <div class="ext-skeleton-icon"></div>
                        <div class="ext-skeleton-icon"></div>
                    </div>
                </div>
                <div class="relative z-50 flex h-full flex-col justify-between overflow-auto">
                    <div class="relative grow overflow-y-auto overflow-x-hidden p-2 flex items-center justify-center">
                        <div class="ext-skeleton-bars"><span></span><span></span><span></span></div>
                    </div>
                    <div>
                        <div class="relative flex flex-col px-4 pb-2 pt-2.5 shadow-lg-flipped"></div>
                        <div class="p-4 pb-2 pt-0">
                            <div class="relative flex w-full flex-col rounded-sm border border-gray-300 bg-gray-50">
                                <textarea class="flex max-h-[calc(75dvh)] min-h-16 w-full resize-none overflow-y-auto bg-transparent px-2 pb-4 pt-2.5 text-base placeholder:text-gray-700 focus:shadow-none focus:outline-hidden disabled:opacity-50 md:text-sm border-none text-gray-900" placeholder="<?php echo \esc_attr__('Ask anything', 'extendify-local'); ?>" rows="1" tabindex="-1" readonly></textarea>
                                <div class="flex justify-between gap-4 px-2 pb-2">
                                    <div class="ms-auto flex items-center gap-1">
                                        <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-full border-0 bg-design-main p-0 text-white transition-colors disabled:opacity-20" disabled>
                                            <svg height="20" width="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.9 6.5 9.5l1 1 3.8-3.7V20h1.5V6.8l3.7 3.7 1-1z"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="text-pretty px-4 pb-2 text-center text-xss leading-none text-gray-700">
                            <?php echo \esc_html__('AI Agent can make mistakes. Check changes before saving.', 'extendify-local'); ?>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
        // phpcs:enable Generic.Files.LineLength.TooLong
    }
}
