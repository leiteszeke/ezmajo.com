<?php

/**
 * The tools this plugin writes by hand, and what each one accepts.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

/**
 * Descriptions and schemas stay English: the model reads them, the user never
 * does, and MCP carries no locale to translate them into.
 */
class Tools
{
    /**
     * Read on every tools/list, so it is a PHP array rather than parsed JSON.
     *
     * @return array
     */
    public static function all()
    {
        return [
            'list_posts' => self::listPosts(),
            'get_post' => self::getPost(),
            'update_posts_metadata' => self::updatePostsMetadata(),
            'search_site' => self::searchSite(),
            'list_comments' => self::listComments(),
            'set_comment_status' => self::setCommentStatus(),
            'reply_to_comment' => self::replyToComment(),
            'list_terms' => self::listTerms(),
            'create_term' => self::createTerm(),
            'set_post_terms' => self::setPostTerms(),
            'list_media' => self::listMedia(),
            'add_media_from_url' => self::addMediaFromUrl(),
            'update_alt_texts' => self::updateAltTexts(),
            'regenerate_thumbnails' => self::regenerateThumbnails(),
            'list_plugins' => self::listPlugins(),
            'install_plugin' => self::installPlugin(),
            'set_plugin_status' => self::setPluginStatus(),
            'update_plugins' => self::updatePlugins(),
            'set_auto_updates' => self::setAutoUpdates(),
            'delete_inactive_plugins' => self::deleteInactivePlugins(),
            'list_themes' => self::listThemes(),
            'update_themes' => self::updateThemes(),
            'delete_inactive_themes' => self::deleteInactiveThemes(),
            'list_users' => self::listUsers(),
            'create_user' => self::createUser(),
            'delete_users' => self::deleteUsers(),
            'get_site_info' => self::getSiteInfo(),
            'update_site_settings' => self::updateSiteSettings(),
            'get_site_health' => self::getSiteHealth(),
            'update_core' => self::updateCore(),
            'get_task_status' => self::getTaskStatus(),
            'request_feature' => self::requestFeature(),
        ];
    }

    /**
     * The editor's own types are show_in_rest without being content anyone asks for.
     *
     * @return array
     */
    public static function types()
    {
        $types = \get_post_types(['public' => true, 'show_in_rest' => true], 'names');

        return array_values(array_diff($types, ['attachment']));
    }

    /**
     * A role that manages the site is left out, so a model cannot name one and be refused.
     *
     * @return array - The roles create_user may give someone.
     */
    public static function roles()
    {
        $offered = [];
        foreach (array_keys(\wp_roles()->get_names()) as $role) {
            $granted = \get_role($role);
            if ($granted && !$granted->has_cap('manage_options')) {
                $offered[] = $role;
            }
        }

        return $offered;
    }

    /**
     * @return array - The taxonomies a term tool may name.
     */
    public static function taxonomies()
    {
        return array_values(\get_taxonomies(['public' => true, 'show_in_rest' => true], 'names'));
    }

    /**
     * @return array
     */
    private static function listPosts()
    {
        return [
            'mode' => Grants::READ,
            'handler' => 'listPosts',
            'description' => 'Lists posts, pages, or any other content type on this site - titles, status, dates,'
                . ' author and links, but not the full body. Use it to find content before reading or changing it.'
                . " Set type to 'page' for pages, or to a custom type reported by get_site_info. To read a post's"
                . ' actual content, call get_post with an id from these results, and for its comments call'
                . ' list_comments with that id.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'type' => [
                        'type' => 'string',
                        'enum' => self::types(),
                        'default' => 'post',
                        'description' => "Content type to list. 'post' for blog posts, 'page' for pages."
                            . ' Custom types vary by site and are reported by get_site_info.',
                    ],
                    'search' => [
                        'type' => 'string',
                        'description' => 'Only return items whose title or content matches this text.',
                    ],
                    'status' => [
                        'type' => 'string',
                        'enum' => ['publish', 'draft', 'pending', 'private', 'future', 'trash', 'any'],
                        'default' => 'publish',
                        'description' => 'Only return items with this status.',
                    ],
                    'author' => [
                        'type' => 'integer',
                        'description' => 'Only return items written by this user id.',
                    ],
                    'after' => [
                        'type' => 'string',
                        'format' => 'date-time',
                        'description' => 'Only items published after this ISO 8601 date.',
                    ],
                    'before' => [
                        'type' => 'string',
                        'format' => 'date-time',
                        'description' => 'Only items published before this ISO 8601 date.',
                    ],
                    'per_page' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'default' => 20],
                    'page' => ['type' => 'integer', 'minimum' => 1, 'default' => 1],
                ],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function getPost()
    {
        return [
            'mode' => Grants::READ,
            'handler' => 'getPost',
            'description' => 'Reads one post or page in full, including its block markup. Use it after list_posts'
                . ' or search_site has given you an id. The block markup is what you need to understand how a page'
                . ' is built before suggesting changes to it.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'id' => [
                        'type' => 'integer',
                        'description' => 'The post id, from list_posts or search_site.',
                    ],
                    'type' => [
                        'type' => 'string',
                        'enum' => self::types(),
                        'default' => 'post',
                        'description' => 'Content type the id belongs to.',
                    ],
                ],
                'required' => ['id'],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function updatePostsMetadata()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'updatePostsMetadata',
            'description' => 'Changes fields on posts and pages, one or many in a single call: title, status,'
                . ' excerpt, slug, publication date, and any custom field the site has registered for its own API.'
                . ' Use it for the bulk work a person would otherwise click through - publishing a batch of drafts,'
                . ' trashing an old series, rewriting excerpts. Earlier wording stays in each post revision'
                . ' history, so text is recoverable, but a changed slug breaks every link to the old address and a'
                . ' date moved into the future unpublishes the post until then. List the exact changes for the user'
                . ' before calling. Most SEO plugins do not register their fields for the API, so their titles and'
                . ' descriptions cannot be set here.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'items' => [
                        'type' => 'array',
                        'minItems' => 1,
                        'maxItems' => 50,
                        'description' => 'One entry per post, each naming the fields to change on it.',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'id' => ['type' => 'integer', 'description' => 'The post id.'],
                                'type' => [
                                    'type' => 'string',
                                    'enum' => self::types(),
                                    'default' => 'post',
                                    'description' => 'The content type of that post.',
                                ],
                                'title' => ['type' => 'string', 'description' => 'New title.'],
                                'status' => [
                                    'type' => 'string',
                                    'enum' => ['publish', 'draft', 'pending', 'private', 'future', 'trash'],
                                    'description' => "New status. 'future' needs a date to go live on.",
                                ],
                                'excerpt' => ['type' => 'string', 'description' => 'New excerpt.'],
                                'slug' => [
                                    'type' => 'string',
                                    'description' => 'New slug. Changes the address visitors and search engines'
                                        . ' already have.',
                                ],
                                'date' => [
                                    'type' => 'string',
                                    'format' => 'date-time',
                                    'description' => 'New publication date, ISO 8601.',
                                ],
                                'meta' => [
                                    'type' => 'object',
                                    'description' => 'Custom fields to set, by name. Only fields the site has'
                                        . ' registered for its own API are accepted, and never footnotes, which'
                                        . ' are part of the content; anything else is refused.',
                                ],
                            ],
                            'required' => ['id'],
                        ],
                    ],
                ],
                'required' => ['items'],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function searchSite()
    {
        return [
            'mode' => Grants::READ,
            'handler' => 'searchSite',
            'description' => 'Searches every content type at once - posts, pages, media and custom types -'
                . ' returning id, title, type and URL for each match. Use it when you know roughly what the user'
                . ' means but not which content type it lives in. When you already know the type, list_posts gives'
                . ' you more precise filtering.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'query' => ['type' => 'string', 'description' => 'What to search for.'],
                    'per_page' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'default' => 20],
                    'page' => ['type' => 'integer', 'minimum' => 1, 'default' => 1],
                ],
                'required' => ['query'],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function listComments()
    {
        return [
            'mode' => Grants::READ,
            'handler' => 'listComments',
            'description' => 'Lists comments with the commenter\'s name, the date, the post they are on, their'
                . ' moderation state and their text. Email and IP addresses are deliberately excluded. Call it'
                . ' before set_comment_status so you can show the user exactly what would change. Pending comments'
                . ' are the ones waiting on a decision, and spam arrives in bursts, often on one post. The default'
                . ' status covers approved and pending only - ask for spam or trash by name.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'status' => [
                        'type' => 'string',
                        'enum' => ['any', 'approved', 'pending', 'spam', 'trash'],
                        'default' => 'any',
                        'description' => "Moderation state. 'any' covers approved and pending, not spam or trash.",
                    ],
                    'post' => ['type' => 'integer', 'description' => 'Only comments on this post id.'],
                    'search' => ['type' => 'string', 'description' => 'Match against the comment text.'],
                    'after' => [
                        'type' => 'string',
                        'format' => 'date-time',
                        'description' => 'Only comments written after this ISO 8601 date.',
                    ],
                    'before' => [
                        'type' => 'string',
                        'format' => 'date-time',
                        'description' => 'Only comments written before this ISO 8601 date.',
                    ],
                    'per_page' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'default' => 20],
                    'page' => ['type' => 'integer', 'minimum' => 1, 'default' => 1],
                ],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function setCommentStatus()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'setCommentStatus',
            'description' => 'Approves comments, sends them back to pending, marks them as spam, or moves them to'
                . ' the trash. Each of those is reversible by calling again with another value, and a trashed'
                . ' comment stays recoverable until the site owner empties the trash. Ids are the ones list_comments'
                . ' reports. Show the user the comments first: marking a real person as spam is worse than leaving'
                . ' one pending, since it teaches the filter to catch them again.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'ids' => [
                        'type' => 'array',
                        'items' => ['type' => 'integer'],
                        'maxItems' => 100,
                        'description' => 'Comment ids to change, as list_comments reports them.',
                    ],
                    'status' => [
                        'type' => 'string',
                        'enum' => ['approved', 'pending', 'spam', 'trash'],
                        'description' => 'The state to put them in.',
                    ],
                ],
                'required' => ['ids', 'status'],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function replyToComment()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'replyToComment',
            'description' => 'Replies to a comment, on the same post, as the account this connection belongs to.'
                . ' The reply is published straight away and is visible to everyone reading that post, so show the'
                . ' user the exact wording and let them agree before sending it. Write the reply in the language'
                . ' of the comment it answers.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'comment' => [
                        'type' => 'integer',
                        'description' => 'The comment id being replied to, as list_comments reports it.',
                    ],
                    'content' => ['type' => 'string', 'description' => 'The reply text.'],
                ],
                'required' => ['comment', 'content'],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function listTerms()
    {
        return [
            'mode' => Grants::READ,
            'handler' => 'listTerms',
            'description' => 'Lists the categories, tags or other taxonomy terms on this site, with how many posts'
                . ' each one holds and which term it sits under. Call it before set_post_terms so you use ids that'
                . ' exist, and to spot the near-duplicates a site collects over time - a category with one post in'
                . ' it is usually a typo of another one.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'taxonomy' => [
                        'type' => 'string',
                        'enum' => self::taxonomies(),
                        'default' => 'category',
                        'description' => 'Which set of terms to list.',
                    ],
                    'search' => ['type' => 'string', 'description' => 'Match against the term name.'],
                    'post' => ['type' => 'integer', 'description' => 'Only terms assigned to this post id.'],
                    'per_page' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'default' => 50],
                    'page' => ['type' => 'integer', 'minimum' => 1, 'default' => 1],
                ],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function createTerm()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'createTerm',
            'description' => 'Creates a category, tag or other taxonomy term. Check list_terms first: a site that'
                . ' already has a close match wants that one, not a second one beside it. A term with no posts on'
                . ' it changes nothing a visitor sees until set_post_terms assigns it.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'taxonomy' => [
                        'type' => 'string',
                        'enum' => self::taxonomies(),
                        'default' => 'category',
                        'description' => 'Which set of terms to add to.',
                    ],
                    'name' => ['type' => 'string', 'description' => 'The term name, as a visitor would read it.'],
                    'parent' => [
                        'type' => 'integer',
                        'description' => 'Sit it under this term id. Only taxonomies that nest accept one.',
                    ],
                    'description' => [
                        'type' => 'string',
                        'description' => 'Optional text some themes show on the term archive.',
                    ],
                ],
                'required' => ['name'],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function setPostTerms()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'setPostTerms',
            'description' => "Sets which terms of one taxonomy a post carries. 'replace' is the default and drops"
                . " every term of that taxonomy the post currently has, so read the post's terms with list_terms"
                . " before using it; 'add' keeps what is there. Terms may be named by id or by name, and a name"
                . ' that no term matches is reported back rather than created - create_term does that. Changing'
                . ' categories changes which archive pages a post appears on, and a post left with no category'
                . ' falls into the default one.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer', 'description' => 'The post id.'],
                    'type' => [
                        'type' => 'string',
                        'enum' => self::types(),
                        'default' => 'post',
                        'description' => 'The content type of that post.',
                    ],
                    'taxonomy' => [
                        'type' => 'string',
                        'enum' => self::taxonomies(),
                        'default' => 'category',
                        'description' => 'Which set of terms is being set.',
                    ],
                    'terms' => [
                        'type' => 'array',
                        'items' => ['type' => ['integer', 'string']],
                        'description' => 'Term ids, or term names exactly as list_terms reports them.',
                    ],
                    'mode' => [
                        'type' => 'string',
                        'enum' => ['replace', 'add'],
                        'default' => 'replace',
                        'description' => 'Whether the terms given replace what the post has or join it.',
                    ],
                ],
                'required' => ['id', 'terms'],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function listMedia()
    {
        return [
            'mode' => Grants::READ,
            'handler' => 'listMedia',
            'description' => 'Lists items in the media library - images, video, documents - with id, filename,'
                . ' MIME type, dimensions, URL and alt text. Use it to find an image, or to see which images'
                . ' are missing alt text before calling update_alt_texts.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'search' => [
                        'type' => 'string',
                        'description' => 'Match against filename, title and caption.',
                    ],
                    'mime_type' => [
                        'type' => 'string',
                        'description' => "Filter by MIME type or prefix, for example 'image' or 'image/png'.",
                    ],
                    'missing_alt_text' => [
                        'type' => 'boolean',
                        'default' => false,
                        'description' => 'Only return images that have no alt text set.',
                    ],
                    'per_page' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'default' => 20],
                    'page' => ['type' => 'integer', 'minimum' => 1, 'default' => 1],
                ],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function addMediaFromUrl()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'addMediaFromUrl',
            'description' => 'Downloads a file from a public web address and adds it to the media library, then'
                . ' reports the id to use with it. Only addresses the whole internet can reach work: an address on'
                . ' the server itself or inside its private network is refused, and so is any file type this'
                . ' WordPress does not accept. The file is copied, so a later change at the original address does'
                . ' not reach the site. Ask the user where the file came from before adding it - a copyrighted'
                . ' image is their liability, not the model\'s. Pass alt_text for an image whenever the page it is'
                . ' meant for is known; list_media can find images missing it later.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'url' => [
                        'type' => 'string',
                        'format' => 'uri',
                        'description' => 'The public address of the file to copy.',
                    ],
                    'filename' => [
                        'type' => 'string',
                        'description' => 'Name to store it under. Taken from the address when left out.',
                    ],
                    'alt_text' => [
                        'type' => 'string',
                        'description' => 'What the image shows, for someone who cannot see it.',
                    ],
                    'title' => ['type' => 'string', 'description' => 'Library title. Defaults to the file name.'],
                    'post' => [
                        'type' => 'integer',
                        'description' => 'Attach it to this post id, the way an upload from that editor would.',
                    ],
                ],
                'required' => ['url'],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function updateAltTexts()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'updateAltTexts',
            'description' => 'Sets the alt text of images in the media library, for screen readers and search'
                . ' engines. Find images with list_media, look at each one, and write one plain, concrete sentence'
                . " describing it; do not start with 'Image of' or 'Photo of'. Images that already have alt text"
                . ' are left alone unless overwrite is true. Low risk and easy to correct afterwards in the media'
                . ' library.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'items' => [
                        'type' => 'array',
                        'minItems' => 1,
                        'maxItems' => 100,
                        'description' => 'The images to describe, by attachment id from list_media.',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'id' => ['type' => 'integer', 'description' => 'The attachment id.'],
                                'alt_text' => [
                                    'type' => 'string',
                                    'minLength' => 1,
                                    'description' => 'The sentence describing the image.',
                                ],
                            ],
                            'required' => ['id', 'alt_text'],
                        ],
                    ],
                    'overwrite' => [
                        'type' => 'boolean',
                        'default' => false,
                        'description' => 'Replace alt text an image already has.',
                    ],
                ],
                'required' => ['items'],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function listPlugins()
    {
        return [
            'mode' => Grants::READ,
            'handler' => 'listPlugins',
            'description' => 'Lists every plugin installed on the site, active or not: name, slug, version, active'
                . ' status, whether an update is available, and whether auto-updates are on. Call it before'
                . ' update_plugins, set_plugin_status, set_auto_updates or delete_inactive_plugins so you can tell'
                . ' the user exactly what would change, and to say which plugins are out of date. Check it before'
                . ' install_plugin too - what the user is asking for is often already installed.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'status' => ['type' => 'string', 'enum' => ['active', 'inactive', 'any'], 'default' => 'any'],
                    'has_update' => [
                        'type' => 'boolean',
                        'default' => false,
                        'description' => 'Only return plugins with an available update.',
                    ],
                ],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function installPlugin()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'installPlugin',
            'description' => 'Installs a plugin from the WordPress.org plugin directory by its slug - the last part'
                . ' of its directory listing address, like contact-form-7. Nothing else can be installed this way:'
                . ' a plugin sold or hosted elsewhere has to be uploaded by hand. A plugin is third-party code that'
                . ' runs with full access to the site, so name the exact plugin to the user and get their agreement'
                . ' before calling this. It arrives deactivated unless activate is true; either way the site keeps'
                . ' working as it did until it is activated. Check list_plugins first, since what the user wants is'
                . ' often already installed and only needs set_plugin_status.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'slug' => [
                        'type' => 'string',
                        'description' => 'The directory slug of the plugin, as WordPress.org lists it.',
                    ],
                    'activate' => [
                        'type' => 'boolean',
                        'default' => false,
                        'description' => 'Activate it immediately after installing.',
                    ],
                ],
                'required' => ['slug'],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function setPluginStatus()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'setPluginStatus',
            'description' => 'Activates or deactivates installed plugins. Activating runs that plugin on every'
                . ' page of the site, and deactivating takes away whatever it provided - a shop, a form, a'
                . ' cache - so say which plugins and which direction, and let the user agree first. Reversible by'
                . ' calling again with the opposite value, though a plugin that stores nothing outside its own'
                . ' settings can still lose in-progress state. Slugs are the ones list_plugins reports. Deleting'
                . ' the files instead is delete_inactive_plugins.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'plugins' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                        'description' => 'Plugin slugs to change, as list_plugins reports them.',
                    ],
                    'active' => [
                        'type' => 'boolean',
                        'description' => 'True to activate them, false to deactivate them.',
                    ],
                ],
                'required' => ['plugins', 'active'],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function deleteInactivePlugins()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'deleteInactivePlugins',
            'description' => 'Permanently removes plugins that are installed but not active. This deletes their'
                . ' files; settings held in the database often survive but not always, so reinstalling does not'
                . " reliably restore a plugin's configuration. Active plugins are never touched. Run preview first"
                . ' and show the user the list - people frequently keep a deactivated plugin on purpose. Slugs are'
                . ' the ones list_plugins reports.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'exclude' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                        'description' => 'Plugin slugs to keep regardless.',
                    ],
                    'preview' => [
                        'type' => 'boolean',
                        'default' => true,
                        'description' => 'When true, lists what would be deleted and returns a confirm_token'
                            . ' without deleting anything.',
                    ],
                    'confirm_token' => [
                        'type' => 'string',
                        'description' => 'The token returned by a previous preview. Required to actually delete.',
                    ],
                ],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function listThemes()
    {
        return [
            'mode' => Grants::READ,
            'handler' => 'listThemes',
            'description' => 'Lists installed themes with name, stylesheet directory, version, whether each is the'
                . ' active theme or the parent of it, whether an update is available, and whether auto-updates are'
                . ' on. Only one theme is active at a time, and its parent is in use even though it is not the'
                . ' active one. Call it before update_themes or delete_inactive_themes so you can tell the user'
                . ' exactly what would change.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'status' => ['type' => 'string', 'enum' => ['active', 'inactive', 'any'], 'default' => 'any'],
                ],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function updateThemes()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'updateThemes',
            'description' => 'Updates themes to their latest published versions. A theme update can change how the'
                . ' site looks, and it cannot be undone from here, so run with preview first, show the user which'
                . ' themes and which version numbers would change, and only proceed once they agree. A theme with'
                . " customizations made outside the site editor is the risky case. Omit 'themes' to update"
                . ' everything that has an update available. Starts a background job and returns a job id to follow'
                . ' with get_task_status.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'themes' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                        'description' => 'Theme stylesheet directories to update, as list_themes reports them.'
                            . ' Omit to update every theme with an available update.',
                    ],
                    'preview' => [
                        'type' => 'boolean',
                        'default' => true,
                        'description' => 'When true, reports what would be updated and returns a confirm_token'
                            . ' without changing anything.',
                    ],
                    'confirm_token' => [
                        'type' => 'string',
                        'description' => 'The token returned by a previous preview. Required to actually perform'
                            . ' the update, and only valid for the exact set the preview reported.',
                    ],
                ],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function listUsers()
    {
        return [
            'mode' => Grants::READ,
            'handler' => 'listUsers',
            'description' => 'Lists user accounts with id, display name, username, roles, registration date and'
                . ' post count. Email addresses are deliberately excluded. Use it before delete_users so you can'
                . ' show exactly which accounts match, and to spot spam registrations - they usually arrive in'
                . ' bursts and have no posts.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'role' => ['type' => 'string', 'description' => 'Only return users with this role.'],
                    'registered_after' => [
                        'type' => 'string',
                        'format' => 'date-time',
                        'description' => 'Only users who registered after this ISO 8601 date.',
                    ],
                    'registered_before' => [
                        'type' => 'string',
                        'format' => 'date-time',
                        'description' => 'Only users who registered before this ISO 8601 date.',
                    ],
                    'max_posts' => [
                        'type' => 'integer',
                        'minimum' => 0,
                        'description' => 'Only users with at most this many published or private posts, pages'
                            . ' or other content.',
                    ],
                    'search' => [
                        'type' => 'string',
                        'description' => 'Match against username and display name.',
                    ],
                    'per_page' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'default' => 20],
                    'page' => ['type' => 'integer', 'minimum' => 1, 'default' => 1],
                ],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function createUser()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'createUser',
            'description' => 'Creates a user account. No password is set here and none is ever returned: with'
                . ' send_email true WordPress emails the person a link to choose their own, and without it someone'
                . ' has to send that link from the users screen before the account can be used. Accounts that can'
                . " manage the site cannot be created through a connection, and an existing account's role cannot"
                . ' be changed at all. Read the role back to the user before calling - the difference between one'
                . ' that may only write drafts and one that may publish is not obvious from its name.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'username' => [
                        'type' => 'string',
                        'description' => 'The login name. It cannot be changed afterwards.',
                    ],
                    'email' => [
                        'type' => 'string',
                        'format' => 'email',
                        'description' => 'Their email address. No other account may already use it.',
                    ],
                    'role' => [
                        'type' => 'string',
                        'enum' => self::roles(),
                        'default' => 'subscriber',
                        'description' => 'What the account may do.',
                    ],
                    'name' => [
                        'type' => 'string',
                        'description' => 'The name shown beside their posts and comments.',
                    ],
                    'send_email' => [
                        'type' => 'boolean',
                        'default' => false,
                        'description' => 'Email the person that the account exists, with a link to set a password.',
                    ],
                ],
                'required' => ['username', 'email'],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function deleteUsers()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'deleteUsers',
            'description' => 'Permanently deletes user accounts matching a filter and reassigns any content they'
                . ' own to another user. Built for clearing spam registrations - accounts that arrive in a burst'
                . ' and have written nothing. Deletion cannot be undone. The account this connection belongs to,'
                . ' the reassign_to account and every administrator are never deleted, whatever the filter says,'
                . ' and the tool refuses to run on multisite. reassign_to is required: without it WordPress'
                . " deletes the users' posts along with their accounts. Handles up to " . Handlers::DELETE_BATCH
                . ' accounts per run; when more match, the result says how many remain for the next preview.'
                . ' Always preview first and show the user the full list of accounts.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'reassign_to' => [
                        'type' => 'integer',
                        'description' => 'User id that inherits any content owned by the deleted accounts.',
                    ],
                    'registered_after' => [
                        'type' => 'string',
                        'format' => 'date-time',
                        'description' => 'Only delete users who registered after this ISO 8601 date.',
                    ],
                    'registered_before' => [
                        'type' => 'string',
                        'format' => 'date-time',
                        'description' => 'Only delete users who registered before this ISO 8601 date.',
                    ],
                    'role' => [
                        'type' => 'string',
                        'description' => 'Only delete users with this role. Administrators are refused regardless.',
                    ],
                    'max_posts' => [
                        'type' => 'integer',
                        'minimum' => 0,
                        'default' => 0,
                        'description' => 'Only delete users with at most this many published or private posts,'
                            . ' pages or other content. Their drafts do not count and pass to reassign_to.',
                    ],
                    'preview' => [
                        'type' => 'boolean',
                        'default' => true,
                        'description' => 'When true, lists the accounts that match and returns a confirm_token'
                            . ' without deleting anything.',
                    ],
                    'confirm_token' => [
                        'type' => 'string',
                        'description' => 'The token returned by a previous preview. Only valid for the exact set'
                            . ' of accounts that preview reported.',
                    ],
                ],
                'required' => ['reassign_to'],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function regenerateThumbnails()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'regenerateThumbnails',
            'description' => 'Recreates the resized copies WordPress makes of each uploaded image. Use it after'
                . ' switching themes or changing image sizes, when thumbnails are cropped wrong or look blurry.'
                . ' Original uploads are never altered, so it is safe to run again. Starts a background job and'
                . ' returns a job id to follow with get_task_status; a large media library takes a long time.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'ids' => [
                        'type' => 'array',
                        'items' => ['type' => 'integer'],
                        'description' => 'Specific attachment ids. Omit to process the whole media library.',
                    ],
                    'only_missing' => [
                        'type' => 'boolean',
                        'default' => false,
                        'description' => 'Only create sizes that are absent, rather than rebuilding every size.',
                    ],
                ],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function updatePlugins()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'updatePlugins',
            'description' => 'Updates plugins to their latest published versions. This cannot be undone from here,'
                . ' and an update can change or break how a site looks or behaves. Always run with preview first,'
                . ' show the user which plugins and which version numbers would change, and only proceed once they'
                . " agree. Omit 'plugins' to update everything that has an update available. Update plugins before"
                . ' update_core, not after. Starts a background job and returns a job id to follow with'
                . ' get_task_status.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'plugins' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                        'description' => 'Plugin slugs to update. Omit to update every plugin with an available'
                            . ' update.',
                    ],
                    'preview' => [
                        'type' => 'boolean',
                        'default' => true,
                        'description' => 'When true, reports what would be updated and returns a confirm_token'
                            . ' without changing anything.',
                    ],
                    'confirm_token' => [
                        'type' => 'string',
                        'description' => 'The token returned by a previous preview. Required to actually perform'
                            . ' the update, and only valid for the exact set the preview reported.',
                    ],
                ],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function updateCore()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'updateCore',
            'description' => 'Updates WordPress itself to the latest version. This is the highest-risk action'
                . ' available: a core update can break plugins and themes that have not been tested against the'
                . ' new version, and it cannot be undone from here. Always preview first, tell the user the version'
                . ' they would move from and to, and recommend they have a backup. Run update_plugins before this,'
                . ' since plugin authors ship compatibility fixes ahead of core releases; the tool refuses to start'
                . ' while plugin updates are waiting. Starts a background job to follow with get_task_status.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'preview' => [
                        'type' => 'boolean',
                        'default' => true,
                        'description' => 'When true, reports the current and target versions and returns a'
                            . ' confirm_token without changing anything.',
                    ],
                    'confirm_token' => [
                        'type' => 'string',
                        'description' => 'The token returned by a previous preview. Required to actually perform'
                            . ' the update.',
                    ],
                ],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function setAutoUpdates()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'setAutoUpdates',
            'description' => 'Turns automatic updates on or off for specific plugins and themes, or for all of them'
                . ' at once. Enabling them is the low-effort way to keep a site current, at the cost of future'
                . ' versions installing without anyone reviewing them first. Immediately reversible - call again'
                . ' with the opposite value.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'enabled' => [
                        'type' => 'boolean',
                        'description' => 'True to turn auto-updates on, false to turn them off.',
                    ],
                    'plugins' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                        'description' => 'Plugin slugs to change, as list_plugins reports them.',
                    ],
                    'themes' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                        'description' => 'Theme stylesheet directories to change, as list_themes reports them.',
                    ],
                    'all' => [
                        'type' => 'boolean',
                        'default' => false,
                        'description' => 'Apply to every installed plugin and theme, ignoring the lists above.',
                    ],
                ],
                'required' => ['enabled'],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function deleteInactiveThemes()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'deleteInactiveThemes',
            'description' => 'Permanently removes themes that are not in use. The active theme and its parent are'
                . ' never deleted. Keep one bundled default theme as a fallback - WordPress switches to it if the'
                . ' active theme breaks - which keep_default does by default. Not reversible from here: a deleted'
                . ' theme has to be reinstalled, though its saved settings stay in the database. Run preview first'
                . ' and show the user the list.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'exclude' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                        'description' => 'Theme stylesheet directories to keep regardless.',
                    ],
                    'keep_default' => [
                        'type' => 'boolean',
                        'default' => true,
                        'description' => 'Keep the most recent bundled WordPress theme as a fallback.',
                    ],
                    'preview' => [
                        'type' => 'boolean',
                        'default' => true,
                        'description' => 'When true, lists what would be deleted and returns a confirm_token'
                            . ' without deleting anything.',
                    ],
                    'confirm_token' => [
                        'type' => 'string',
                        'description' => 'The token returned by a previous preview. Required to actually delete.',
                    ],
                ],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function updateSiteSettings()
    {
        return [
            'mode' => Grants::WRITE,
            'handler' => 'updateSiteSettings',
            'description' => "Changes the site's name, tagline, language, timezone and the way it writes dates and"
                . ' times. The name and tagline are read by every visitor and by search engines, so quote the exact'
                . ' wording to the user first. A timezone or format change only affects how existing dates are'
                . ' shown; nothing is renamed or moved. Changing the language changes the wording WordPress itself'
                . ' uses, never the words already written into posts, and the translation has to be installable on'
                . ' this site. get_site_info reports what each of these is now. This is the only tool that may'
                . ' change a site setting - every other setting a connection could reach is refused.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'title' => ['type' => 'string', 'description' => "The site's name."],
                    'tagline' => ['type' => 'string', 'description' => 'The short line under the name.'],
                    'language' => [
                        'type' => 'string',
                        'description' => 'A WordPress locale such as de_DE, or en_US for English.',
                    ],
                    'timezone' => [
                        'type' => 'string',
                        'description' => 'A timezone name such as Europe/Amsterdam.',
                    ],
                    'date_format' => [
                        'type' => 'string',
                        'description' => 'PHP date format for dates, such as F j, Y.',
                    ],
                    'time_format' => [
                        'type' => 'string',
                        'description' => 'PHP date format for times, such as g:i a.',
                    ],
                    'start_of_week' => [
                        'type' => 'integer',
                        'minimum' => 0,
                        'maximum' => 6,
                        'description' => 'Which day calendars start on, 0 for Sunday.',
                    ],
                ],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function getSiteHealth()
    {
        return [
            'mode' => Grants::READ,
            'handler' => 'getSiteHealth',
            'description' => "Reports the site's maintenance status: WordPress and PHP versions and whether PHP is"
                . ' still supported, database version, memory limit, HTTPS status, whether WP-Cron and background'
                . ' updates are working, how many plugins and themes are behind, and whether automatic updates are'
                . ' honored. Use it to explain why maintenance is needed before running any update - a site whose'
                . ' cron or background updates are broken will silently fail to keep itself current, and a'
                . ' background job started here depends on cron. Filesystem paths, database credentials and'
                . ' server constants are deliberately excluded.',
            'inputSchema' => ['type' => 'object', 'properties' => (object) []],
        ];
    }

    /**
     * @return array
     */
    private static function requestFeature()
    {
        return [
            'mode' => Grants::READ,
            'handler' => 'requestFeature',
            'annotations' => ['destructiveHint' => false],
            'description' => 'Passes on a request for a tool this site does not have, to the people who build'
                . ' these tools. Call it only when the user has asked for something none of the other tools can'
                . ' do, tell the user you are passing the request on, and send one request per conversation. It'
                . ' changes nothing on the site. What you write is sent as it is, so leave out names, email'
                . ' addresses and anything quoted from the site.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'tool' => [
                        'type' => 'string',
                        'pattern' => '^[a-z0-9_]{1,64}$',
                        'description' => 'The name the missing tool would have, in the style of the tools that'
                            . " exist, such as 'schedule_post'.",
                    ],
                    'justification' => [
                        'type' => 'string',
                        'minLength' => 20,
                        'maxLength' => 2000,
                        'description' => 'What the tool would do and why the existing tools cannot.',
                    ],
                    'context' => [
                        'type' => 'string',
                        'maxLength' => 2000,
                        'description' => 'What the user was trying to get done.',
                    ],
                ],
                'required' => ['tool', 'justification'],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function getTaskStatus()
    {
        return [
            'mode' => Grants::READ,
            'handler' => 'getTaskStatus',
            'description' => 'Reports on a background job started by update_plugins, update_themes, update_core or'
                . ' regenerate_thumbnails: whether it is queued, running, done or failed, how many steps are'
                . ' finished, and the result of each. Jobs run on WP-Cron, so one that stays queued means the'
                . " site's cron is not firing; get_site_health says whether it is.",
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'job_id' => ['type' => 'string', 'description' => 'The job id the tool returned.'],
                ],
                'required' => ['job_id'],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function getSiteInfo()
    {
        return [
            'mode' => Grants::READ,
            'handler' => 'getSiteInfo',
            'description' => "Returns the site's identity and setup: name, tagline, URL, language, timezone,"
                . ' WordPress version, active theme, the content types available, and how many plugins are'
                . ' installed and active. Call this early in a conversation to ground yourself in what kind of'
                . ' site this is before doing anything else. update_site_settings changes the ones that can be'
                . ' changed.',
            'inputSchema' => ['type' => 'object', 'properties' => (object) []],
        ];
    }
}
