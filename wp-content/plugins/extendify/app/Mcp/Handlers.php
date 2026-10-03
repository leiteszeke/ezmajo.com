<?php

/**
 * What each hand-written tool does when a connection calls it.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;
use Extendify\Constants;

/**
 * Every write goes back through the REST server, so the route's own
 * permission_callback decides it as the connection's owner. A raw REST body
 * would carry fields nobody asked for, so the answer is picked, not passed on.
 */
class Handlers
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    const DELETE_BATCH = 100;

    const FEATURE_REQUESTS = 'extendify_mcp_feature_requests';

    const FEATURE_REQUESTS_A_DAY = 10;

    const FEATURE_REQUEST_GAP = 60;

    /**
     * An unlisted field reaching the route would change more than the tool says it does.
     */
    const POST_FIELDS = ['title', 'status', 'excerpt', 'slug', 'date', 'meta'];

    /**
     * Core renders these into the post itself, and this tool never changes a post's body.
     */
    const BODY_META = ['footnotes'];

    /**
     * Each setting a tool may change, against the name the settings route knows it by.
     */
    const SITE_SETTINGS = [
        'title' => 'title',
        'tagline' => 'description',
        'language' => 'language',
        'timezone' => 'timezone',
        'date_format' => 'date_format',
        'time_format' => 'time_format',
        'start_of_week' => 'start_of_week',
    ];

    /**
     * The options those settings land in, and the only ones this tool's call may write.
     */
    const SITE_OPTIONS = [
        'blogname',
        'blogdescription',
        'WPLANG',
        'timezone_string',
        'gmt_offset',
        'date_format',
        'time_format',
        'start_of_week',
    ];

    /**
     * The word core's comment write takes for each state a tool names.
     */
    const COMMENT_STATES = [
        'approved' => 'approved',
        'pending' => 'hold',
        'spam' => 'spam',
        'trash' => 'trash',
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function listPosts(array $arguments)
    {
        $route = self::typeRoute($arguments['type']);
        $response = self::request('GET', $route, [
            'search' => $arguments['search'] ?? null,
            'status' => $arguments['status'],
            'author' => $arguments['author'] ?? null,
            'after' => $arguments['after'] ?? null,
            'before' => $arguments['before'] ?? null,
            'per_page' => $arguments['per_page'],
            'page' => $arguments['page'],
            '_fields' => 'id,title,status,type,slug,date,modified,author,link',
        ]);

        return \is_wp_error($response) ? $response : self::listed($response, [self::class, 'shapePost']);
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function getPost(array $arguments)
    {
        $route = self::typeRoute($arguments['type']);
        // Only edit context carries the raw block markup the description promises.
        $response = self::request('GET', $route . '/' . (int) $arguments['id'], ['context' => 'edit']);
        if (\is_wp_error($response)) {
            return $response;
        }

        $item = (array) $response->get_data();

        return array_merge(self::shapePost($item), [
            'parent' => (int) ($item['parent'] ?? 0),
            'featured_media' => (int) ($item['featured_media'] ?? 0),
            'excerpt' => self::raw($item['excerpt'] ?? ''),
            'content' => self::raw($item['content'] ?? ''),
        ]);
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function updatePostsMetadata(array $arguments)
    {
        $updated = [];
        $failed = [];
        foreach ((array) $arguments['items'] as $item) {
            $item = (array) $item;
            $id = (int) ($item['id'] ?? 0);
            $body = array_intersect_key($item, array_flip(self::POST_FIELDS));
            if (!$body) {
                $failed[] = ['id' => $id, 'error' => 'No field to change was given for this post.'];
                continue;
            }

            $type = (string) ($item['type'] ?? 'post');
            $metaKeys = array_keys((array) ($body['meta'] ?? []));
            $inBody = array_intersect($metaKeys, self::BODY_META);
            if ($inBody) {
                $failed[] = ['id' => $id, 'error' => sprintf(
                    '%s is part of the post content, which this tool does not change.',
                    implode(', ', $inBody)
                )];
                continue;
            }

            $unregistered = self::unregistered($metaKeys, $type);
            if ($unregistered) {
                $failed[] = ['id' => $id, 'error' => sprintf(
                    'This site has not registered %s for its API, so it cannot be set here.',
                    implode(', ', $unregistered)
                )];
                continue;
            }

            $route = self::typeRoute($type) . '/' . $id;
            // The REST update refuses trash as a status; only its DELETE moves a post there.
            $trashing = ($body['status'] ?? '') === 'trash';
            if ($trashing) {
                unset($body['status']);
            }

            $response = $body ? self::request('POST', $route, $body) : null;
            if ($trashing && !\is_wp_error($response)) {
                $response = self::request('DELETE', $route);
            }

            if (\is_wp_error($response)) {
                $failed[] = ['id' => $id, 'error' => $response->get_error_message()];
                continue;
            }

            $updated[] = self::shapePost((array) $response->get_data());
        }

        return ['updated' => $updated, 'failed' => $failed];
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function searchSite(array $arguments)
    {
        $response = self::request('GET', 'wp/v2/search', [
            'search' => $arguments['query'],
            'per_page' => $arguments['per_page'],
            'page' => $arguments['page'],
        ]);
        if (\is_wp_error($response)) {
            return $response;
        }

        return self::listed($response, function (array $item) {
            return [
                'id' => (int) ($item['id'] ?? 0),
                'title' => self::title($item['title'] ?? ''),
                'url' => (string) ($item['url'] ?? ''),
                'type' => (string) ($item['type'] ?? ''),
                'subtype' => (string) ($item['subtype'] ?? ''),
            ];
        });
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function listComments(array $arguments)
    {
        $response = self::request('GET', 'wp/v2/comments', [
            'context' => 'edit',
            'status' => self::commentQuery($arguments['status']),
            'post' => $arguments['post'] ?? null,
            'search' => $arguments['search'] ?? null,
            'after' => $arguments['after'] ?? null,
            'before' => $arguments['before'] ?? null,
            'per_page' => $arguments['per_page'],
            'page' => $arguments['page'],
        ]);

        return \is_wp_error($response) ? $response : self::listed($response, [self::class, 'shapeComment']);
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function setCommentStatus(array $arguments)
    {
        $status = self::COMMENT_STATES[(string) $arguments['status']];
        $changed = [];
        $failed = [];
        foreach (array_unique(array_map('intval', (array) $arguments['ids'])) as $id) {
            $response = self::request('POST', 'wp/v2/comments/' . $id, ['status' => $status]);
            if (\is_wp_error($response)) {
                $failed[] = ['id' => $id, 'error' => $response->get_error_message()];
                continue;
            }

            $changed[] = ['id' => $id, 'status' => (string) (((array) $response->get_data())['status'] ?? '')];
        }

        return ['changed' => $changed, 'failed' => $failed];
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function replyToComment(array $arguments)
    {
        $parent = \get_comment((int) $arguments['comment']);
        if (!$parent) {
            return new \WP_Error('extendify_mcp_no_comment', 'No comment has that id. Call list_comments first.');
        }

        $response = self::request('POST', 'wp/v2/comments', [
            'post' => (int) $parent->comment_post_ID,
            'parent' => (int) $parent->comment_ID,
            'author' => \get_current_user_id(),
            'content' => (string) $arguments['content'],
            'status' => 'approved',
        ]);

        return \is_wp_error($response) ? $response : self::shapeComment((array) $response->get_data());
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function listTerms(array $arguments)
    {
        $taxonomy = (string) $arguments['taxonomy'];
        $response = self::request('GET', self::taxonomyRoute($taxonomy), [
            'search' => $arguments['search'] ?? null,
            'post' => $arguments['post'] ?? null,
            'per_page' => $arguments['per_page'],
            'page' => $arguments['page'],
            'orderby' => 'count',
            'order' => 'desc',
        ]);

        if (\is_wp_error($response)) {
            return $response;
        }

        return self::listed($response, function (array $item) use ($taxonomy) {
            return self::shapeTerm($item, $taxonomy);
        });
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function createTerm(array $arguments)
    {
        $taxonomy = (string) $arguments['taxonomy'];
        $response = self::request('POST', self::taxonomyRoute($taxonomy), [
            'name' => (string) $arguments['name'],
            'parent' => $arguments['parent'] ?? null,
            'description' => $arguments['description'] ?? null,
        ]);

        return \is_wp_error($response)
            ? $response
            : self::shapeTerm((array) $response->get_data(), $taxonomy);
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function setPostTerms(array $arguments)
    {
        $taxonomy = (string) $arguments['taxonomy'];
        $object = \get_taxonomy($taxonomy);
        $field = empty($object->rest_base) ? $taxonomy : $object->rest_base;
        if (!in_array((string) $arguments['type'], (array) $object->object_type, true)) {
            return new \WP_Error('extendify_mcp_refused', sprintf(
                'The %s taxonomy does not apply to %s content.',
                $taxonomy,
                $arguments['type']
            ));
        }

        $resolved = self::terms((array) $arguments['terms'], $taxonomy);
        if ($resolved['unknown']) {
            return new \WP_Error('extendify_mcp_no_term', sprintf(
                'No term in %s is named %s. Call list_terms, or create_term first.',
                $taxonomy,
                implode(', ', $resolved['unknown'])
            ));
        }

        $ids = $resolved['ids'];
        if ($arguments['mode'] === 'add') {
            $ids = array_values(array_unique(array_merge(
                \wp_get_object_terms((int) $arguments['id'], $taxonomy, ['fields' => 'ids']),
                $ids
            )));
        }

        $route = self::typeRoute((string) $arguments['type']) . '/' . (int) $arguments['id'];
        $response = self::request('POST', $route, [$field => array_map('intval', $ids)]);
        if (\is_wp_error($response)) {
            return $response;
        }

        return [
            'id' => (int) $arguments['id'],
            'taxonomy' => $taxonomy,
            'terms' => array_map(function ($id) use ($taxonomy) {
                $term = \get_term((int) $id, $taxonomy);

                return ['id' => (int) $id, 'name' => $term ? self::title($term->name) : ''];
            }, (array) (((array) $response->get_data())[$field] ?? [])),
        ];
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function listMedia(array $arguments)
    {
        $bare = empty($arguments['missing_alt_text']) ? null : self::bareAltText();
        if ($bare) {
            \add_filter('rest_attachment_query', $bare);
        }

        try {
            $response = self::request('GET', 'wp/v2/media', array_merge([
                'search' => $arguments['search'] ?? null,
                'per_page' => $arguments['per_page'],
                'page' => $arguments['page'],
            ], self::mime($arguments['mime_type'] ?? null)));
        } finally {
            if ($bare) {
                \remove_filter('rest_attachment_query', $bare);
            }
        }

        if (\is_wp_error($response)) {
            return $response;
        }

        return self::listed($response, function (array $item) {
            $details = (array) ($item['media_details'] ?? []);
            $url = (string) ($item['source_url'] ?? '');

            return [
                'id' => (int) ($item['id'] ?? 0),
                'title' => self::title($item['title'] ?? ''),
                'filename' => \wp_basename($url),
                'mime_type' => (string) ($item['mime_type'] ?? ''),
                'alt_text' => (string) ($item['alt_text'] ?? ''),
                'width' => (int) ($details['width'] ?? 0),
                'height' => (int) ($details['height'] ?? 0),
                'url' => $url,
                'date' => (string) ($item['date'] ?? ''),
            ];
        });
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function addMediaFromUrl(array $arguments)
    {
        // Blocks a connection whose own user may not upload from writing files to the server.
        if (!\current_user_can('upload_files')) {
            return new \WP_Error('extendify_mcp_refused', 'This user may not add to the media library.');
        }

        foreach (['file', 'media', 'image'] as $include) {
            require_once ABSPATH . 'wp-admin/includes/' . $include . '.php';
        }

        $url = (string) $arguments['url'];
        // download_url() fetches through wp_safe_remote_get, which refuses loopback and private addresses.
        $temporary = \download_url($url);
        if (\is_wp_error($temporary)) {
            return new \WP_Error('extendify_mcp_refused', sprintf(
                'That address could not be read: %s',
                $temporary->get_error_message()
            ));
        }

        $upload = [
            'name' => (string) ($arguments['filename'] ?? '') ?: basename((string) parse_url($url, PHP_URL_PATH)),
            'tmp_name' => $temporary,
        ];
        $data = isset($arguments['title']) ? ['post_title' => (string) $arguments['title']] : [];
        $id = \media_handle_sideload($upload, (int) ($arguments['post'] ?? 0), null, $data);
        if (\is_wp_error($id)) {
            if (file_exists($temporary)) {
                unlink($temporary);
            }

            return new \WP_Error('extendify_mcp_refused', $id->get_error_message());
        }

        if (isset($arguments['alt_text'])) {
            \update_post_meta($id, '_wp_attachment_image_alt', \sanitize_text_field($arguments['alt_text']));
        }

        return [
            'id' => (int) $id,
            'title' => self::title(\get_the_title($id)),
            'mime_type' => (string) \get_post_mime_type($id),
            'url' => (string) \wp_get_attachment_url($id),
            'attached_to' => (int) ($arguments['post'] ?? 0),
            'alt_text' => (string) \get_post_meta($id, '_wp_attachment_image_alt', true),
        ];
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function updateAltTexts(array $arguments)
    {
        $updated = [];
        $skipped = [];
        foreach ($arguments['items'] as $item) {
            $id = (int) $item['id'];
            if (empty($arguments['overwrite']) && \get_post_meta($id, '_wp_attachment_image_alt', true) !== '') {
                $skipped[] = ['id' => $id, 'reason' => 'Already has alt text. Pass overwrite to replace it.'];
                continue;
            }

            $response = self::request('POST', 'wp/v2/media/' . $id, ['alt_text' => $item['alt_text']]);
            if (\is_wp_error($response)) {
                $skipped[] = ['id' => $id, 'reason' => $response->get_error_message()];
                continue;
            }

            $updated[] = ['id' => $id, 'alt_text' => (string) (((array) $response->get_data())['alt_text'] ?? '')];
        }

        return ['updated' => $updated, 'skipped' => $skipped];
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function listPlugins(array $arguments)
    {
        $response = self::request('GET', 'wp/v2/plugins', self::status($arguments['status']));
        if (\is_wp_error($response)) {
            return $response;
        }

        $waiting = self::waiting('update_plugins');
        $auto = (array) \get_site_option('auto_update_plugins', []);

        $items = [];
        foreach ((array) $response->get_data() as $item) {
            // The controller answers with the plugin file, minus the extension every list stores.
            $file = $item['plugin'] . '.php';
            $update = $waiting[$file] ?? null;
            if (!empty($arguments['has_update']) && $update === null) {
                continue;
            }

            $items[] = [
                'slug' => (string) $item['plugin'],
                'name' => self::title($item['name'] ?? ''),
                'version' => (string) ($item['version'] ?? ''),
                'status' => (string) ($item['status'] ?? ''),
                'update_available' => $update !== null,
                'new_version' => self::newVersion($update),
                'auto_update' => in_array($file, $auto, true),
            ];
        }

        return ['items' => $items, 'total' => count($items)];
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function deleteInactivePlugins(array $arguments)
    {
        $items = self::inactivePlugins(array_map('strval', (array) ($arguments['exclude'] ?? [])));
        if (!empty($arguments['preview'])) {
            return self::preview('delete_inactive_plugins', $items, 'slug');
        }

        $refused = self::unconfirmed('delete_inactive_plugins', array_column($items, 'slug'), $arguments);
        if ($refused) {
            return $refused;
        }

        $deleted = [];
        $failed = [];
        foreach ($items as $item) {
            $response = self::request('DELETE', 'wp/v2/plugins/' . $item['slug']);
            if (\is_wp_error($response)) {
                $failed[] = ['slug' => $item['slug'], 'error' => $response->get_error_message()];
                continue;
            }

            $deleted[] = $item['slug'];
        }

        return ['deleted' => $deleted, 'failed' => $failed];
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function installPlugin(array $arguments)
    {
        $slug = (string) $arguments['slug'];
        $status = !empty($arguments['activate']) ? 'active' : 'inactive';
        $response = self::unguarded('POST', 'wp/v2/plugins', ['slug' => $slug, 'status' => $status]);
        if (\is_wp_error($response)) {
            return $response;
        }

        $item = (array) $response->get_data();

        return [
            'slug' => (string) ($item['plugin'] ?? $slug),
            'name' => self::title($item['name'] ?? ''),
            'version' => (string) ($item['version'] ?? ''),
            'status' => (string) ($item['status'] ?? ''),
        ];
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function setPluginStatus(array $arguments)
    {
        $status = !empty($arguments['active']) ? 'active' : 'inactive';
        $changed = [];
        $failed = [];
        foreach (array_unique(array_map('strval', (array) $arguments['plugins'])) as $slug) {
            $response = self::unguarded('POST', 'wp/v2/plugins/' . $slug, ['status' => $status]);
            if (\is_wp_error($response)) {
                $failed[] = ['slug' => $slug, 'error' => $response->get_error_message()];
                continue;
            }

            $changed[] = ['slug' => $slug, 'status' => (string) (((array) $response->get_data())['status'] ?? '')];
        }

        return ['changed' => $changed, 'failed' => $failed];
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function listThemes(array $arguments)
    {
        $response = self::request('GET', 'wp/v2/themes', self::status($arguments['status']));
        if (\is_wp_error($response)) {
            return $response;
        }

        $waiting = self::waiting('update_themes');
        $auto = (array) \get_site_option('auto_update_themes', []);
        $parent = \get_template();
        $items = array_map(function (array $item) use ($waiting, $auto, $parent) {
            $stylesheet = (string) ($item['stylesheet'] ?? '');
            $update = $waiting[$stylesheet] ?? null;

            return [
                'stylesheet' => $stylesheet,
                'name' => self::title($item['name'] ?? ''),
                'version' => (string) ($item['version'] ?? ''),
                'active' => ($item['status'] ?? '') === 'active',
                'parent_of_active' => $stylesheet === $parent && $parent !== \get_stylesheet(),
                'update_available' => $update !== null,
                'new_version' => self::newVersion($update),
                'auto_update' => in_array($stylesheet, $auto, true),
            ];
        }, (array) $response->get_data());

        return ['items' => $items, 'total' => count($items)];
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function listUsers(array $arguments)
    {
        $registered = self::registeredBetween($arguments);
        if ($registered) {
            \add_filter('rest_user_query', $registered);
        }

        try {
            $response = self::request('GET', 'wp/v2/users', [
                'context' => 'edit',
                'roles' => $arguments['role'] ?? null,
                'search' => $arguments['search'] ?? null,
                'exclude' => isset($arguments['max_posts']) ? self::wroteMoreThan($arguments['max_posts']) : null,
                'per_page' => $arguments['per_page'],
                'page' => $arguments['page'],
            ]);
        } finally {
            if ($registered) {
                \remove_filter('rest_user_query', $registered);
            }
        }

        if (\is_wp_error($response)) {
            return $response;
        }

        $counts = \count_many_users_posts(array_column((array) $response->get_data(), 'id'), Tools::types());

        return self::listed($response, function (array $item) use ($counts) {
            return [
                'id' => (int) $item['id'],
                'name' => (string) ($item['name'] ?? ''),
                'username' => (string) ($item['username'] ?? ''),
                'roles' => array_values((array) ($item['roles'] ?? [])),
                'registered' => (string) ($item['registered_date'] ?? ''),
                'post_count' => (int) ($counts[$item['id']] ?? 0),
            ];
        });
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function createUser(array $arguments)
    {
        if (\is_multisite()) {
            return new \WP_Error(
                'extendify_mcp_refused',
                'Creating an account is not available on a multisite network.'
            );
        }

        $response = Guard::registering(function () use ($arguments) {
            return self::request('POST', 'wp/v2/users', [
                'username' => (string) $arguments['username'],
                'email' => (string) $arguments['email'],
                // Nobody is told this: the account is reached by a reset link, never a shared password.
                'password' => \wp_generate_password(24, true, true),
                'roles' => [(string) $arguments['role']],
                'name' => $arguments['name'] ?? null,
            ]);
        });

        if (\is_wp_error($response)) {
            return $response;
        }

        $item = (array) $response->get_data();
        $id = (int) ($item['id'] ?? 0);
        if (!empty($arguments['send_email'])) {
            \wp_new_user_notification($id, null, 'user');
        }

        return [
            'id' => $id,
            'username' => (string) ($item['username'] ?? ''),
            'name' => self::title($item['name'] ?? ''),
            'roles' => array_values((array) ($item['roles'] ?? [])),
            'emailed' => !empty($arguments['send_email']),
        ];
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function deleteUsers(array $arguments)
    {
        if (\is_multisite()) {
            return new \WP_Error('extendify_mcp_refused', 'Deleting users is not available on a multisite network.');
        }

        $reassign = (int) $arguments['reassign_to'];
        if (!\get_userdata($reassign)) {
            return new \WP_Error('extendify_mcp_refused', 'reassign_to must be the id of a user this site has.');
        }

        $admins = self::adminRoles();
        if (in_array($arguments['role'] ?? '', $admins, true)) {
            return new \WP_Error('extendify_mcp_refused', 'Administrators are never deleted by this tool.');
        }

        $query = new \WP_User_Query(self::deletable($arguments, $reassign, $admins));
        $users = $query->get_results();
        $counts = \count_many_users_posts(\wp_list_pluck($users, 'ID'), Tools::types());
        $items = array_map(function (\WP_User $user) use ($counts) {
            return self::shapeUser($user, $counts);
        }, $users);
        if (!empty($arguments['preview'])) {
            return self::preview('delete_users', $items, 'id', (int) $query->get_total());
        }

        $refused = self::unconfirmed('delete_users', array_column($items, 'id'), $arguments);
        if ($refused) {
            return $refused;
        }

        $deleted = [];
        $failed = [];
        foreach ($items as $item) {
            $response = self::request('DELETE', 'wp/v2/users/' . $item['id'], [
                'force' => true,
                'reassign' => $reassign,
            ]);
            if (\is_wp_error($response)) {
                $failed[] = ['id' => $item['id'], 'error' => $response->get_error_message()];
                continue;
            }

            $deleted[] = $item['id'];
        }

        return [
            'deleted' => $deleted,
            'failed' => $failed,
            'reassigned_to' => $reassign,
            'remaining' => max(0, (int) $query->get_total() - count($items)),
        ];
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function updatePlugins(array $arguments)
    {
        $items = Maintenance::pluginUpdates(array_map('strval', (array) ($arguments['plugins'] ?? [])));
        if (!empty($arguments['preview'])) {
            $answer = self::preview('update_plugins', $items, 'slug');
            if (!$items) {
                $answer['note'] = 'Every plugin is up to date.';
            }

            return $answer;
        }

        if (!$items) {
            return ['started' => false, 'note' => 'Every plugin is up to date.'];
        }

        $refused = self::unconfirmed('update_plugins', array_column($items, 'slug'), $arguments);
        if ($refused) {
            return $refused;
        }

        if (!\current_user_can('update_plugins')) {
            return new \WP_Error('extendify_mcp_refused', 'This user may not update plugins.');
        }

        $files = array_map(function ($slug) {
            return $slug . '.php';
        }, array_column($items, 'slug'));

        return Jobs::start('update_plugins', ['plugins' => $files], count($files));
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function updateThemes(array $arguments)
    {
        $items = Maintenance::themeUpdates(array_map('strval', (array) ($arguments['themes'] ?? [])));
        if (!empty($arguments['preview'])) {
            $answer = self::preview('update_themes', $items, 'stylesheet');
            if (!$items) {
                $answer['note'] = 'Every theme is up to date.';
            }

            return $answer;
        }

        if (!$items) {
            return ['started' => false, 'note' => 'Every theme is up to date.'];
        }

        $refused = self::unconfirmed('update_themes', array_column($items, 'stylesheet'), $arguments);
        if ($refused) {
            return $refused;
        }

        if (!\current_user_can('update_themes')) {
            return new \WP_Error('extendify_mcp_refused', 'This user may not update themes.');
        }

        $stylesheets = array_column($items, 'stylesheet');

        return Jobs::start('update_themes', ['themes' => $stylesheets], count($stylesheets));
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function updateCore(array $arguments)
    {
        $update = Maintenance::coreUpdate();
        $waiting = count(Maintenance::pluginUpdates());
        if (!empty($arguments['preview'])) {
            $answer = [
                'preview' => true,
                'current_version' => $GLOBALS['wp_version'],
                'update_available' => $update !== null,
                'new_version' => $update ? $update['to'] : null,
                'plugins_waiting' => $waiting,
            ];
            if ($update) {
                $answer['confirm_token'] = Confirmation::issue('update_core', [$update['to']]);
            }

            return $answer;
        }

        if (!$update) {
            return new \WP_Error('extendify_mcp_refused', 'WordPress is already at the latest version.');
        }

        if ($waiting) {
            return new \WP_Error('extendify_mcp_refused', sprintf(
                '%d plugin(s) have updates waiting. Run update_plugins first; plugin authors ship compatibility'
                    . ' fixes ahead of core releases.',
                $waiting
            ));
        }

        $refused = self::unconfirmed('update_core', [$update['to']], $arguments);
        if ($refused) {
            return $refused;
        }

        if (!\current_user_can('update_core')) {
            return new \WP_Error('extendify_mcp_refused', 'This user may not update WordPress.');
        }

        return Jobs::start('update_core', ['version' => $update['to'], 'locale' => $update['locale']], 1);
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function setAutoUpdates(array $arguments)
    {
        return Maintenance::setAutoUpdates(
            !empty($arguments['enabled']),
            array_map('strval', (array) ($arguments['plugins'] ?? [])),
            array_map('strval', (array) ($arguments['themes'] ?? [])),
            !empty($arguments['all'])
        );
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function deleteInactiveThemes(array $arguments)
    {
        if (\is_multisite()) {
            return new \WP_Error('extendify_mcp_refused', 'Deleting themes is not available on a multisite network.');
        }

        $items = Maintenance::inactiveThemes(
            array_map('strval', (array) ($arguments['exclude'] ?? [])),
            !empty($arguments['keep_default'])
        );
        if (!empty($arguments['preview'])) {
            return self::preview('delete_inactive_themes', $items, 'stylesheet');
        }

        $refused = self::unconfirmed('delete_inactive_themes', array_column($items, 'stylesheet'), $arguments);
        if ($refused) {
            return $refused;
        }

        $deleted = [];
        $failed = [];
        foreach ($items as $item) {
            $reason = Maintenance::deleteTheme($item['stylesheet']);
            if ($reason !== null) {
                $failed[] = ['stylesheet' => $item['stylesheet'], 'error' => $reason];
                continue;
            }

            $deleted[] = $item['stylesheet'];
        }

        return ['deleted' => $deleted, 'failed' => $failed];
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function regenerateThumbnails(array $arguments)
    {
        $found = Maintenance::imageIds(isset($arguments['ids']) ? (array) $arguments['ids'] : null);
        if (!$found['ids']) {
            return ['total' => 0, 'skipped' => $found['skipped'], 'note' => 'No images to process.'];
        }

        if (!\current_user_can('upload_files')) {
            return new \WP_Error('extendify_mcp_refused', 'This user may not work on the media library.');
        }

        $payload = ['ids' => $found['ids'], 'only_missing' => !empty($arguments['only_missing'])];
        $answer = Jobs::start('regenerate_thumbnails', $payload, count($found['ids']));
        if ($found['skipped']) {
            $answer['skipped'] = $found['skipped'];
        }

        return $answer;
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function updateSiteSettings(array $arguments)
    {
        $given = array_intersect_key($arguments, self::SITE_SETTINGS);
        if (!$given) {
            return new \WP_Error('extendify_mcp_refused', 'No setting to change was given.');
        }

        if (isset($given['language'])) {
            $refusal = self::translated((string) $given['language']);
            if ($refusal) {
                return $refusal;
            }
        }

        $fields = [];
        foreach ($given as $name => $value) {
            $fields[self::SITE_SETTINGS[$name]] = $value;
        }

        $response = Guard::permitting(self::SITE_OPTIONS, function () use ($fields) {
            return self::request('POST', 'wp/v2/settings', $fields);
        });

        if (\is_wp_error($response)) {
            return $response;
        }

        $settings = (array) $response->get_data();
        $answer = [];
        foreach (self::SITE_SETTINGS as $name => $field) {
            $answer[$name] = $settings[$field] ?? null;
        }

        // Core stores the name and tagline escaped.
        $answer['title'] = self::title($answer['title']);
        $answer['tagline'] = self::title($answer['tagline']);

        return $answer;
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function getSiteHealth(array $arguments)
    {
        return Maintenance::health();
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function getTaskStatus(array $arguments)
    {
        $status = Jobs::status((string) $arguments['job_id']);

        return $status ?: new \WP_Error(
            'extendify_mcp_no_job',
            'No such job for this connection. Job ids come from update_plugins, update_themes, update_core and'
                . ' regenerate_thumbnails.'
        );
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|\WP_Error
     */
    public static function getSiteInfo(array $arguments)
    {
        $settings = self::request('GET', 'wp/v2/settings');
        if (\is_wp_error($settings)) {
            return $settings;
        }

        $themes = self::request('GET', 'wp/v2/themes', ['status' => 'active']);
        if (\is_wp_error($themes)) {
            return $themes;
        }

        $settings = (array) $settings->get_data();
        $active = (array) (((array) $themes->get_data())[0] ?? []);

        return [
            'name' => self::title($settings['title'] ?? ''),
            'tagline' => self::title($settings['description'] ?? ''),
            'url' => (string) ($settings['url'] ?? ''),
            'language' => (string) ($settings['language'] ?? ''),
            'timezone' => (string) ($settings['timezone'] ?? ''),
            'wordpress_version' => \get_bloginfo('version'),
            'active_theme' => [
                'name' => self::title($active['name'] ?? ''),
                'stylesheet' => (string) ($active['stylesheet'] ?? ''),
                'version' => (string) ($active['version'] ?? ''),
            ],
            'content_types' => self::contentTypes(),
            'plugins' => self::pluginCounts(),
        ];
    }

    /**
     * @param string $method - GET, POST or DELETE.
     * @param string $path   - The REST route to call.
     * @param array  $params - The query on a GET, the body otherwise; null and empty values are dropped.
     * @return \WP_REST_Response|\WP_Error
     */
    private static function request($method, $path, array $params = [])
    {
        $request = new \WP_REST_Request($method, '/' . ltrim($path, '/'));
        $params = array_filter($params, function ($value) {
            return $value !== null && $value !== [];
        });
        if ($method === 'GET') {
            $request->set_query_params($params);
        } else {
            $request->set_body_params($params);
        }

        $response = \rest_do_request($request);

        return $response->is_error() ? $response->as_error() : $response;
    }

    /**
     * A plugin's own install and activation routines write options; refusing those leaves it half-installed.
     *
     * @param string $method - The REST method.
     * @param string $path   - The REST route to call.
     * @param array  $params - The body to send.
     * @return \WP_REST_Response|\WP_Error
     */
    private static function unguarded($method, $path, array $params)
    {
        Guard::lift();

        try {
            return self::request($method, $path, $params);
        } finally {
            Guard::hold();
        }
    }

    /**
     * @param string       $tool  - The tool the preview ran for.
     * @param array        $items - What it matched, each carrying $by.
     * @param string       $by    - The field the token is issued over.
     * @param integer|null $total - How many matched in all, when the items are one batch of them.
     * @return array
     */
    private static function preview($tool, array $items, $by, $total = null)
    {
        $answer = ['preview' => true, 'total' => $total ?? count($items), 'items' => $items];
        $set = array_column($items, $by);
        if ($set) {
            $answer['confirm_token'] = Confirmation::issue($tool, $set);
        }

        if ($answer['total'] > count($items)) {
            $answer['remaining'] = $answer['total'] - count($items);
        }

        return $answer;
    }

    /**
     * @param string $tool      - The tool about to execute.
     * @param array  $set       - The ids or slugs it matched now.
     * @param array  $arguments - The validated tool arguments.
     * @return \WP_Error|null - Why it may not go ahead, or null when it may.
     */
    private static function unconfirmed($tool, array $set, array $arguments)
    {
        if (!$set) {
            return null;
        }

        $refusal = Confirmation::refusal($tool, $set, $arguments['confirm_token'] ?? null);

        return $refusal === null ? null : new \WP_Error('extendify_mcp_unconfirmed', $refusal);
    }

    /**
     * @param \WP_REST_Response $response - What the REST server answered.
     * @param callable          $shape    - Given one item, returns the fields to keep.
     * @return array
     */
    private static function listed($response, $shape)
    {
        $items = array_map($shape, (array) $response->get_data());
        $headers = $response->get_headers();

        return [
            'items' => array_values($items),
            'total' => (int) ($headers['X-WP-Total'] ?? count($items)),
            'pages' => (int) ($headers['X-WP-TotalPages'] ?? 1),
        ];
    }

    /**
     * A locale with no translation installed leaves the site in English, saying nothing.
     *
     * @param string $locale - The locale a setting write named.
     * @return \WP_Error|null - Why it may not be set, or null when it may.
     */
    private static function translated($locale)
    {
        if ($locale === 'en_US' || in_array($locale, \get_available_languages(), true)) {
            return null;
        }

        require_once ABSPATH . 'wp-admin/includes/translation-install.php';
        if (\wp_download_language_pack($locale)) {
            return null;
        }

        return new \WP_Error('extendify_mcp_refused', sprintf(
            'The %s translation is not installed and could not be downloaded, so the language is unchanged.',
            $locale
        ));
    }

    /**
     * Core's meta write skips an unknown key, so a model would be told it landed.
     *
     * @param array  $keys - The custom field names a call means to set.
     * @param string $type - The post type they would be written on.
     * @return array - The names this site does not expose.
     */
    private static function unregistered(array $keys, $type)
    {
        $registered = array_merge(
            \get_registered_meta_keys('post', ''),
            \get_registered_meta_keys('post', $type)
        );

        return array_values(array_filter($keys, function ($key) use ($registered) {
            return empty($registered[$key]['show_in_rest']);
        }));
    }

    /**
     * @param array  $item     - One item from a terms controller.
     * @param string $taxonomy - The taxonomy it belongs to.
     * @return array
     */
    private static function shapeTerm(array $item, $taxonomy)
    {
        return [
            'id' => (int) ($item['id'] ?? 0),
            'name' => self::title($item['name'] ?? ''),
            'slug' => (string) ($item['slug'] ?? ''),
            'taxonomy' => $taxonomy,
            'parent' => (int) ($item['parent'] ?? 0),
            'count' => (int) ($item['count'] ?? 0),
            'link' => (string) ($item['link'] ?? ''),
        ];
    }

    /**
     * @param string $taxonomy - The taxonomy being reached.
     * @return string
     */
    private static function taxonomyRoute($taxonomy)
    {
        $object = \get_taxonomy($taxonomy);
        $namespace = empty($object->rest_namespace) ? 'wp/v2' : $object->rest_namespace;

        return $namespace . '/' . (empty($object->rest_base) ? $taxonomy : $object->rest_base);
    }

    /**
     * @param array  $terms    - Ids or names as the tool was given them.
     * @param string $taxonomy - The taxonomy they belong to.
     * @return array - The ids resolved, and the names nothing matched.
     */
    private static function terms(array $terms, $taxonomy)
    {
        $ids = [];
        $unknown = [];
        foreach ($terms as $term) {
            if (is_int($term) || preg_match('/^[0-9]+$/', (string) $term)) {
                $found = \get_term((int) $term, $taxonomy);
                \is_wp_error($found) || !$found ? $unknown[] = (string) $term : $ids[] = (int) $found->term_id;
                continue;
            }

            $found = \get_term_by('name', (string) $term, $taxonomy) ?: \get_term_by('slug', (string) $term, $taxonomy);
            $found ? $ids[] = (int) $found->term_id : $unknown[] = (string) $term;
        }

        return ['ids' => array_values(array_unique($ids)), 'unknown' => $unknown];
    }

    /**
     * A commenter's email, IP and user agent stay out of every answer.
     *
     * @param array $item - One item from the comments controller.
     * @return array
     */
    private static function shapeComment(array $item)
    {
        $post = (int) ($item['post'] ?? 0);

        return [
            'id' => (int) ($item['id'] ?? 0),
            'post' => $post,
            'post_title' => self::title(\get_the_title($post)),
            'author' => self::title($item['author_name'] ?? ''),
            'date' => (string) ($item['date_gmt'] ?? ''),
            'status' => (string) ($item['status'] ?? ''),
            'parent' => (int) ($item['parent'] ?? 0),
            'content' => trim(\wp_strip_all_tags(self::raw($item['content'] ?? ''))),
            'link' => (string) ($item['link'] ?? ''),
        ];
    }

    /**
     * The query says 'approve' where a write says 'approved', and 'all' excludes spam and trash.
     *
     * @param string $status - The state the tool was asked for.
     * @return string
     */
    private static function commentQuery($status)
    {
        $query = [
            'any' => 'all',
            'approved' => 'approve',
            'pending' => 'hold',
            'spam' => 'spam',
            'trash' => 'trash',
        ];

        return $query[$status];
    }

    /**
     * @param array $item - One item from a posts controller.
     * @return array
     */
    private static function shapePost(array $item)
    {
        return [
            'id' => (int) ($item['id'] ?? 0),
            'title' => self::title($item['title'] ?? ''),
            'status' => (string) ($item['status'] ?? ''),
            'type' => (string) ($item['type'] ?? ''),
            'slug' => (string) ($item['slug'] ?? ''),
            'date' => (string) ($item['date'] ?? ''),
            'modified' => (string) ($item['modified'] ?? ''),
            'author' => (int) ($item['author'] ?? 0),
            'link' => (string) ($item['link'] ?? ''),
        ];
    }

    /**
     * @param string $type - The content type asked for, already held to Tools::types() by the schema.
     * @return string
     */
    private static function typeRoute($type)
    {
        $object = \get_post_type_object($type);
        $namespace = empty($object->rest_namespace) ? 'wp/v2' : $object->rest_namespace;

        return $namespace . '/' . (empty($object->rest_base) ? $object->name : $object->rest_base);
    }

    /**
     * @param mixed $field - A field a controller may spell as raw and rendered.
     * @return string
     */
    private static function raw($field)
    {
        if (!is_array($field)) {
            return (string) $field;
        }

        return (string) ($field['raw'] ?? $field['rendered'] ?? '');
    }

    /**
     * @param mixed $field - A title a controller may spell as raw and rendered.
     * @return string
     */
    private static function title($field)
    {
        if (is_array($field) && isset($field['raw'])) {
            return (string) $field['raw'];
        }

        // A rendered title is entity-encoded, and &amp; is noise to a model.
        return \wp_specialchars_decode(self::raw($field), ENT_QUOTES);
    }

    /**
     * @param string $status - active, inactive, or any.
     * @return array
     */
    private static function status($status)
    {
        return $status === 'any' ? [] : ['status' => $status];
    }

    /**
     * @param string $transient - update_plugins or update_themes.
     * @return array
     */
    private static function waiting($transient)
    {
        $updates = \get_site_transient($transient);

        return isset($updates->response) ? (array) $updates->response : [];
    }

    /**
     * Plugin updates arrive as objects and theme updates as arrays.
     *
     * @param mixed $update - What the update transient held, if anything.
     * @return string|null
     */
    private static function newVersion($update)
    {
        if ($update === null) {
            return null;
        }

        return (string) (((array) $update)['new_version'] ?? '');
    }

    /**
     * @param string|null $value - A MIME type, or the prefix standing for one.
     * @return array
     */
    private static function mime($value)
    {
        if (!$value) {
            return [];
        }

        return strpos($value, '/') === false ? ['media_type' => $value] : ['mime_type' => $value];
    }

    /**
     * @return callable
     */
    private static function bareAltText()
    {
        return function (array $args) {
            $args['meta_query'] = [
                'relation' => 'OR',
                ['key' => '_wp_attachment_image_alt', 'compare' => 'NOT EXISTS'],
                ['key' => '_wp_attachment_image_alt', 'value' => '', 'compare' => '='],
            ];

            return $args;
        };
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return array|null - A date_query over user_registered, or null when neither bound was given.
     */
    private static function registered(array $arguments)
    {
        $bounds = array_filter([
            'after' => $arguments['registered_after'] ?? null,
            'before' => $arguments['registered_before'] ?? null,
        ]);

        return $bounds ? [array_merge(['column' => 'user_registered'], $bounds)] : null;
    }

    /**
     * @param array $arguments - The validated tool arguments.
     * @return callable|null
     */
    private static function registeredBetween(array $arguments)
    {
        $registered = self::registered($arguments);
        if (!$registered) {
            return null;
        }

        return function (array $args) use ($registered) {
            $args['date_query'] = $registered;

            return $args;
        };
    }

    /**
     * @param array   $arguments - The validated tool arguments.
     * @param integer $reassign  - The user inheriting the content.
     * @param array   $admins    - The roles that may manage the site.
     * @return array
     */
    private static function deletable(array $arguments, $reassign, array $admins)
    {
        $kept = array_merge([\get_current_user_id(), $reassign], self::wroteMoreThan((int) $arguments['max_posts']));
        $args = [
            'role__not_in' => $admins,
            'exclude' => $kept,
            'number' => self::DELETE_BATCH,
            'orderby' => 'ID',
            'order' => 'ASC',
            'count_total' => true,
        ];
        if (!empty($arguments['role'])) {
            $args['role'] = $arguments['role'];
        }

        $registered = self::registered($arguments);
        if ($registered) {
            $args['date_query'] = $registered;
        }

        return $args;
    }

    /**
     * @return array
     */
    private static function adminRoles()
    {
        $roles = [];
        foreach (\wp_roles()->role_objects as $name => $role) {
            if ($role->has_cap('manage_options')) {
                $roles[] = $name;
            }
        }

        return $roles;
    }

    /**
     * @param \WP_User $user   - A user the query found.
     * @param array    $counts - Post counts by user id.
     * @return array
     */
    private static function shapeUser(\WP_User $user, array $counts)
    {
        return [
            'id' => (int) $user->ID,
            'name' => (string) $user->display_name,
            'username' => (string) $user->user_login,
            'roles' => array_values((array) $user->roles),
            'registered' => gmdate('c', strtotime($user->user_registered)),
            'post_count' => (int) ($counts[$user->ID] ?? 0),
        ];
    }

    /**
     * @param array $exclude - Slugs, or plugin files, to keep.
     * @return array
     */
    private static function inactivePlugins(array $exclude)
    {
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        $items = [];
        foreach (\get_plugins() as $file => $plugin) {
            $slug = preg_replace('/\.php$/', '', $file);
            if (\is_plugin_active($file) || in_array($slug, $exclude, true) || in_array($file, $exclude, true)) {
                continue;
            }

            $items[] = [
                'slug' => $slug,
                'name' => self::title($plugin['Name'] ?? ''),
                'version' => (string) ($plugin['Version'] ?? ''),
            ];
        }

        return $items;
    }

    /**
     * Filtering the page we got back would leave its total and count lying.
     *
     * @param integer $most - The most posts a user may have written.
     * @return array
     */
    private static function wroteMoreThan($most)
    {
        $wpdb = $GLOBALS['wpdb'];
        // Core builds the same WHERE clause count_many_users_posts() counts through.
        $where = \get_posts_by_author_sql(Tools::types(), true, null, false);

        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery
        $authors = $wpdb->get_col($wpdb->prepare(
            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            "SELECT post_author FROM {$wpdb->posts} {$where} GROUP BY post_author HAVING COUNT(*) > %d",
            (int) $most
        ));

        return array_map('intval', $authors);
    }

    /**
     * Counts what went out, not what landed, so a dead service cannot be looped on.
     *
     * @param array $arguments - The tool arguments.
     * @return array|\WP_Error
     */
    public static function requestFeature(array $arguments)
    {
        $sent = array_values(array_filter((array) \get_transient(self::FEATURE_REQUESTS), function ($at) {
            return (int) $at > (time() - DAY_IN_SECONDS);
        }));

        if ($sent && max($sent) > (time() - self::FEATURE_REQUEST_GAP)) {
            return new \WP_Error(
                'extendify_mcp_feature_request_recent',
                'A request from this site went out moments ago. Tell the user, and do not send another.'
            );
        }

        if (count($sent) >= self::FEATURE_REQUESTS_A_DAY) {
            return new \WP_Error('extendify_mcp_feature_requests_today', sprintf(
                'This site has sent %d feature requests today, which is the limit. Try again tomorrow.',
                self::FEATURE_REQUESTS_A_DAY
            ));
        }

        $sent[] = time();
        \set_transient(self::FEATURE_REQUESTS, $sent, DAY_IN_SECONDS);

        return self::passOnRequest($arguments);
    }

    /**
     * @param array $arguments - The tool arguments.
     * @return array|\WP_Error
     */
    private static function passOnRequest(array $arguments)
    {
        $response = \wp_remote_post(Constants::INSIGHTS_HOST . '/api/v1/mcp-feature-request', [
            'timeout' => 5,
            'headers' => [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'X-Extendify-Site-Id' => \get_option('extendify_site_id', ''),
            ],
            'body' => \wp_json_encode([
                'partner' => (string) Config::$partnerId,
                'tool' => $arguments['tool'],
                'justification' => $arguments['justification'],
                'context' => (string) ($arguments['context'] ?? ''),
            ]),
        ]);

        $code = \is_wp_error($response) ? 0 : (int) \wp_remote_retrieve_response_code($response);
        if ($code === 200) {
            return [
                'sent' => true,
                'note' => 'Passed on. Tell the user it was sent, and do not send this request again.',
            ];
        }

        $answered = json_decode(\wp_remote_retrieve_body($response), true);
        $told = is_array($answered) ? (string) ($answered['error'] ?? '') : '';
        // A 404 is the route not deployed yet, which the model can do nothing with.
        if ($told !== '' && $code >= 400 && $code < 500 && $code !== 404) {
            return new \WP_Error('extendify_mcp_feature_request_turned_down', $told);
        }

        return new \WP_Error(
            'extendify_mcp_feature_request_failed',
            'The request could not be sent. Nothing on this site is wrong; tell the user it did not go out.'
        );
    }

    /**
     * @return array
     */
    private static function contentTypes()
    {
        return array_map(function ($type) {
            $object = \get_post_type_object($type);

            return [
                'slug' => $type,
                'label' => (string) $object->labels->name,
                'hierarchical' => (bool) $object->hierarchical,
            ];
        }, Tools::types());
    }

    /**
     * @return array
     */
    private static function pluginCounts()
    {
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        $installed = array_keys(\get_plugins());

        return [
            'installed' => count($installed),
            'active' => count(array_filter($installed, 'is_plugin_active')),
        ];
    }
}
