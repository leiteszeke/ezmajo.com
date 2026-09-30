<?php

/**
 * Admin loader for the simple toolbar feature.
 *
 * Adds the Toolbar Style row (Simple / Full) to the user profile,
 * persists it on save, and reorders the row into place under the
 * core "Toolbar" row at print-footer time. The render decision
 * itself lives in `Frontend::style()` / `Frontend::shouldRender()`.
 */

namespace Extendify\Toolbar;

defined('ABSPATH') || die('No direct access.');

class Admin
{
    public function __construct()
    {
        \add_action('personal_options', [$this, 'renderProfileRow']);
        \add_action('personal_options_update', [$this, 'saveProfileRow']);
        \add_action('edit_user_profile_update', [$this, 'saveProfileRow']);
        \add_action('admin_print_footer_scripts-profile.php', [$this, 'reorderRow']);
        \add_action('admin_print_footer_scripts-user-edit.php', [$this, 'reorderRow']);
    }

    /**
     * Render the Toolbar Style fieldset on the user profile page.
     *
     * @param \WP_User $user
     * @return void
     */
    public function renderProfileRow($user)
    {
        $style = Frontend::style($user->ID);
        // phpcs:disable Generic.Files.LineLength.TooLong -- inline HTML form markup
        ?>
        <tr class="extendify-toolbar-style-wrap">
            <th scope="row"><?php \esc_html_e('Toolbar Style', 'extendify-local'); ?></th>
            <td>
                <fieldset>
                    <legend class="screen-reader-text"><?php \esc_html_e('Toolbar Style', 'extendify-local'); ?></legend>
                    <p>
                        <label>
                            <input type="radio" name="<?php echo \esc_attr(Frontend::STYLE_META); ?>" value="simple" <?php \checked($style, 'simple'); ?> />
                            <?php echo \esc_html_x('Simple', 'toolbar style', 'extendify-local'); ?>
                        </label>
                    </p>
                    <p>
                        <label>
                            <input type="radio" name="<?php echo \esc_attr(Frontend::STYLE_META); ?>" value="full" <?php \checked($style, 'full'); ?> />
                            <?php echo \esc_html_x('Full', 'toolbar style', 'extendify-local'); ?>
                        </label>
                    </p>
                </fieldset>
            </td>
        </tr>
        <?php
        // phpcs:enable Generic.Files.LineLength.TooLong
    }

    /**
     * Persist the Toolbar Style choice on profile save.
     *
     * @param int $userId
     * @return void
     */
    public function saveProfileRow($userId)
    {
        if (!\current_user_can('edit_user', $userId)) {
            return;
        }
        // phpcs:ignore WordPress.Security.NonceVerification.Missing
        $raw = isset($_POST[Frontend::STYLE_META])
            // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.ValidatedSanitizedInput.MissingUnslash
            ? \sanitize_text_field(\wp_unslash($_POST[Frontend::STYLE_META]))
            : 'simple';
        $val = $raw === 'full' ? 'full' : 'simple';
        \update_user_meta($userId, Frontend::STYLE_META, $val);
    }

    /**
     * Move our row to sit immediately after the core "Toolbar" row.
     *
     * The core profile page hardcodes the Toolbar and Language rows
     * in user-edit.php and only fires `personal_options` AFTER both —
     * so PHP priority alone can't position our row between them. We
     * do it client-side at print time.
     *
     * @return void
     */
    public function reorderRow()
    {
        ?>
        <script>
        (function () {
            var ours = document.querySelector('tr.extendify-toolbar-style-wrap');
            var anchor = document.querySelector('tr.user-admin-bar-front-wrap');
            if (ours && anchor && anchor.parentNode) {
                anchor.parentNode.insertBefore(ours, anchor.nextSibling);
            }
        })();
        </script>
        <?php
    }
}
