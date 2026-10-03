<?php

/**
 * The assistants we can tell someone how to connect, and what to tell them.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

use Extendify\Mcp\OAuth\Metadata;

class Clients
{
    /**
     * @return array
     */
    public static function all()
    {
        return [
            self::claude(),
            self::chatgpt(),
            self::anythingElse(),
        ];
    }

    /**
     * Decoded, or a name like "Tom &amp; Jerry" gets copied with the entity.
     *
     * @return string
     */
    public static function siteName()
    {
        $name = trim(\wp_specialchars_decode(\get_bloginfo('name'), ENT_QUOTES));

        return $name !== '' ? $name : (string) \wp_parse_url(\home_url(), PHP_URL_HOST);
    }

    /**
     * Ends by asking for the tool list, so the person learns it worked without us saying so.
     *
     * @return string
     */
    public static function prompt()
    {
        return sprintf(
            /* translators: %s: this site's MCP address, a URL. The whole line is pasted into an AI assistant. */
            \__(
                'Add the MCP server at %s, sign in when prompted, then list the tools you get from it.',
                'extendify-local'
            ),
            Metadata::resource()
        );
    }

    /**
     * The marks WordPress's own Connectors screen draws, so both screens look alike.
     *
     * @param array $client - One of the all() entries.
     * @return string
     */
    public static function logo(array $client)
    {
        $claude = 'M6.2 21.024L12.416 17.536L12.52 17.232L12.416 17.064H12.112L11.072 17L7.52 16.904L4.44 16.776L1.456 '
            . '16.616L0.704 16.456L0 15.528L0.072 15.064L0.704 14.64L1.608 14.72L3.608 14.856L6.608 15.064L8.784 15'
            . '.192L12.008 15.528H12.52L12.592 15.32L12.416 15.192L12.28 15.064L9.176 12.96L5.816 10.736L4.056 9.45'
            . '6L3.104 8.808L2.624 8.2L2.416 6.872L3.28 5.92L4.44 6L4.736 6.08L5.912 6.984L8.424 8.928L11.704 11.34'
            . '4L12.184 11.744L12.376 11.608L12.4 11.512L12.184 11.152L10.4 7.928L8.496 4.648L7.648 3.288L7.424 2.4'
            . '72C7.344 2.136 7.288 1.856 7.288 1.512L8.272 0.176L8.816 0L10.128 0.176L10.68 0.656L11.496 2.52L12.8'
            . '16 5.456L14.864 9.448L15.464 10.632L15.784 11.728L15.904 12.064H16.112V11.872L16.28 9.624L16.592 6.8'
            . '64L16.896 3.312L17 2.312L17.496 1.112L18.48 0.464L19.248 0.832L19.88 1.736L19.792 2.32L19.416 4.76L1'
            . '8.68 8.584L18.2 11.144H18.48L18.8 10.824L20.096 9.104L22.272 6.384L23.232 5.304L24.352 4.112L25.072 '
            . '3.544H26.432L27.432 5.032L26.984 6.568L25.584 8.344L24.424 9.848L22.76 12.088L21.72 13.88L21.816 14.'
            . '024L22.064 14L25.824 13.2L27.856 12.832L30.28 12.416L31.376 12.928L31.496 13.448L31.064 14.512L28.47'
            . '2 15.152L25.432 15.76L20.904 16.832L20.848 16.872L20.912 16.952L22.952 17.144L23.824 17.192H25.96L29'
            . '.936 17.488L30.976 18.176L31.6 19.016L31.496 19.656L29.896 20.472L27.736 19.96L22.696 18.76L20.968 1'
            . '8.328H20.728V18.472L22.168 19.88L24.808 22.264L28.112 25.336L28.28 26.096L27.856 26.696L27.408 26.63'
            . '2L24.504 24.448L23.384 23.464L20.848 21.328H20.68V21.552L21.264 22.408L24.352 27.048L24.512 28.472L2'
            . '4.288 28.936L23.488 29.216L22.608 29.056L20.8 26.52L18.936 23.664L17.432 21.104L17.248 21.208L16.36 '
            . '30.768L15.944 31.256L14.984 31.624L14.184 31.016L13.76 30.032L14.184 28.088L14.696 25.552L15.112 23.'
            . '536L15.488 21.032L15.712 20.2L15.696 20.144L15.512 20.168L13.624 22.76L10.752 26.64L8.48 29.072L7.93'
            . '6 29.288L6.992 28.8L7.08 27.928L7.608 27.152L10.752 23.152L12.648 20.672L13.872 19.24L13.864 19.032H'
            . '13.792L5.44 24.456L3.952 24.648L3.312 24.048L3.392 23.064L3.696 22.744L6.208 21.016L6.2 21.024Z';
        $chatgpt = 'M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.065'
            . '1 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 '
            . '0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7'
            . '718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755'
            . ' 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.16'
            . '86a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 '
            . '1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1'
            . '-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1'
            . '.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2'
            . '.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364l2.0201-1.1685a.0757.0757 0 0 1 .0'
            . '71 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4043-.6813zm2.0107-3.0231l'
            . '-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l'
            . '4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.056'
            . '7V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.097'
            . '6-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z';

        $marks = [
            'claude' => '<svg viewBox="0 0 32 32"><path fill="#D97757" d="' . $claude . '"/></svg>',
            'chatgpt' => '<svg viewBox="0 0 24 24"><path fill="currentColor" d="' . $chatgpt . '"/></svg>',
        ];

        return $marks[$client['id']] ?? '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/>'
            . '<circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
    }

    /**
     * @param string $url - Where the link goes.
     * @return string
     */
    private static function newTab($url)
    {
        return 'href="' . \esc_url($url) . '" target="_blank" rel="noopener noreferrer"';
    }

    /**
     * @param array $substeps - The click path the step's button would have saved.
     * @return array
     */
    private static function buttonFallback(array $substeps)
    {
        return [
            /* translators: opens manual instructions for when the setup button did not work. */
            'summary' => \__('Button didn\'t work?', 'extendify-local'),
            'substeps' => $substeps,
        ];
    }

    // phpcs:disable Generic.Files.LineLength.TooLong -- one msgid per sentence; the markup can push one past 120.
    /**
     * @param string $assistant - The assistant's product name.
     * @return string
     */
    private static function approveOnSite($assistant)
    {
        return sprintf(
            /* translators: %s: an AI assistant's name, such as Claude. Approve is this site's button. */
            \__(
                'You\'ll be taken to WordPress to choose what %s can do. Then click <strong>Approve</strong>.',
                'extendify-local'
            ),
            $assistant
        );
    }

    /**
     * @return array
     */
    private static function claude()
    {
        $dialog = '?' . http_build_query([
            'modal' => 'add-custom-connector',
            'connectorName' => self::siteName(),
            'connectorUrl' => Metadata::resource(),
        ], '', '&', PHP_QUERY_RFC3986);

        return [
            'id' => 'claude',
            'name' => 'Claude',
            'gate' => [
                'tone' => 'ok',
                /* translators: Free is a Claude plan name; keep it in English. */
                'text' => \__('Works on every Claude plan. The Free plan allows one custom connector.', 'extendify-local'),
            ],
            'steps' => [
                [
                    /* translators: heading of the first setup step; Claude is a product name. */
                    'title' => \__('Add this site to Claude', 'extendify-local'),
                    'links' => [
                        [
                            /* translators: button that opens Claude's add-connector dialog in a new tab. */
                            'label' => \__('Add to Claude', 'extendify-local'),
                            'url' => 'https://claude.ai/customize/connectors' . $dialog,
                            'primary' => true,
                        ],
                    ],
                    'substeps' => [
                        /* translators: Continue is a button label in Claude's add-connector dialog. */
                        \__('Claude opens with the name and address filled in. Click <strong>Continue</strong>.', 'extendify-local'),
                        /* translators: Add is a button label in Claude's add-connector dialog. */
                        \__(
                            'On the next screen, leave the authentication settings as they are and click <strong>Add</strong>.',
                            'extendify-local'
                        ),
                    ],
                    'asides' => [
                        self::buttonFallback([
                            sprintf(
                                /* translators: %s: link attributes, keep them as is. */
                                \__('Open <a %s>Claude\'s connector settings</a>.', 'extendify-local'),
                                self::newTab('https://claude.ai/customize/connectors')
                            ),
                            /* translators: Add custom connector is a label in Claude. */
                            \__('Click <strong>+</strong>, then <strong>Add custom connector</strong>.', 'extendify-local'),
                            [
                                /* translators: Continue is a button label in Claude's add-connector dialog. */
                                'text' => \__('Fill in the name and address, then click <strong>Continue</strong>.', 'extendify-local'),
                                'fields' => [
                                    /* translators: the label of the name field an assistant asks for when adding this site. */
                                    'name' => \__('Name', 'extendify-local'),
                                    /* translators: the label over this site's MCP address. MCP is a protocol name. */
                                    'url' => \__('MCP server URL', 'extendify-local'),
                                ],
                            ],
                            /* translators: Add is a button label in Claude's add-connector dialog. */
                            \__('Leave the authentication settings as they are and click <strong>Add</strong>.', 'extendify-local'),
                        ]),
                        [
                            /* translators: opens the setup for Claude's business plans; keep the plan names in English. */
                            'summary' => \__('On a Team or Enterprise plan?', 'extendify-local'),
                            'links' => [
                                [
                                    /* translators: button opening Claude's organization settings, which only an owner can reach. */
                                    'label' => \__('Add for your organization', 'extendify-local'),
                                    'url' => 'https://claude.ai/admin-settings/connectors' . $dialog,
                                    'primary' => false,
                                ],
                            ],
                            'substeps' => [
                                sprintf(
                                    /* translators: %s: link attributes, keep them as is. Add, Custom and Web are labels in Claude. */
                                    \__(
                                        'An owner uses the button below to add it once for everyone. If that doesn\'t work, open <a %s>Organization settings</a>, click <strong>Add</strong>, then <strong>Custom</strong> (choose <strong>Web</strong> if asked).',
                                        'extendify-local'
                                    ),
                                    self::newTab('https://claude.ai/admin-settings/connectors')
                                ),
                                sprintf(
                                    /* translators: %s: link attributes, keep them as is. Connect is a button label in Claude; translate it. */
                                    \__(
                                        'Then each member clicks <strong>Connect</strong> next to it in <a %s>Claude\'s connector settings</a> and approves access.',
                                        'extendify-local'
                                    ),
                                    self::newTab('https://claude.ai/customize/connectors')
                                ),
                            ],
                        ],
                    ],
                ],
                [
                    /* translators: heading of the setup step, where the person approves the assistant here. */
                    'title' => \__('Approve access', 'extendify-local'),
                    'substeps' => [
                        /* translators: Connect is the button on the screen Claude shows next. */
                        \__('Claude asks you to connect. Click <strong>Connect</strong>.', 'extendify-local'),
                        self::approveOnSite('Claude'),
                        /* translators: describes the Claude screen shown after approving; nothing on it needs changing. */
                        \__(
                            'You\'ll be taken back to Claude, to a screen listing its permissions. You don\'t need to change anything.',
                            'extendify-local'
                        ),
                    ],
                ],
                [
                    /* translators: heading of the last setup step, where the connection is used in a chat. */
                    'title' => \__('Use it in a chat', 'extendify-local'),
                    'text' => [
                        /* translators: the quoted request is an example to type into Claude; translate it. */
                        \__('Start a new chat and ask Claude about your site, for example: “List my latest posts.”', 'extendify-local'),
                        /* translators: + and Connectors open Claude's tools menu in a chat. In right-to-left languages, write the arrow as ←. */
                        \__(
                            'If it doesn\'t use your site, click <strong>+</strong> → <strong>Connectors</strong> and check that this site is turned on.',
                            'extendify-local'
                        ),
                    ],
                ],
            ],
        ];
    }

    /**
     * @return array
     */
    private static function chatgpt()
    {
        return [
            'id' => 'chatgpt',
            'name' => 'ChatGPT',
            'gate' => [
                'tone' => 'warn',
                /* translators: Business, Enterprise and Edu are OpenAI plan names; keep them in English. */
                'text' => \__(
                    'On Business, only admins and owners can connect it. On Enterprise and Edu, an admin has to allow it first.',
                    'extendify-local'
                ),
            ],
            'steps' => [
                [
                    /* translators: heading of a setup step; developer mode is a ChatGPT setting. */
                    'title' => \__('Turn on developer mode', 'extendify-local'),
                    'text' => [
                        /* translators: Settings, Security and login and Developer mode are ChatGPT labels. In right-to-left languages, write the arrow as ←. */
                        \__(
                            'In ChatGPT, open <code>Settings → Security and login</code> and turn on <strong>Developer mode</strong>.',
                            'extendify-local'
                        ),
                    ],
                ],
                [
                    /* translators: heading of a setup step where this site is added to ChatGPT as an MCP app. */
                    'title' => \__('Add this site as an MCP app', 'extendify-local'),
                    'substeps' => [
                        /* translators: + is a button in ChatGPT's Plugins page; Browse plugins and Create app are ChatGPT labels. */
                        \__(
                            'Open Plugins with the button below. Click <strong>+</strong> (top right, or next to the search box under Browse plugins) and choose <strong>Create app</strong>.',
                            'extendify-local'
                        ),
                        /* translators: Create MCP app is a ChatGPT button label. */
                        \__('Click <strong>Create MCP app</strong> in the bottom-left corner.', 'extendify-local'),
                        /* translators: Connection and Authentication are ChatGPT field labels; use the same word for Connection as the address field's label below. OAuth is a sign-in standard. */
                        \__(
                            'Give it a name, paste this address into <strong>Connection</strong>, and leave Authentication set to <strong>OAuth</strong>.',
                            'extendify-local'
                        ),
                    ],
                    'links' => [
                        [
                            /* translators: button that opens ChatGPT's Plugins page in a new tab. */
                            'label' => \__('Open ChatGPT Plugins', 'extendify-local'),
                            'url' => 'https://chatgpt.com/plugins',
                            'primary' => true,
                        ],
                    ],
                    'fields' => [
                        /* translators: the label of the name field an assistant asks for when adding this site. */
                        'name' => \__('Name', 'extendify-local'),
                        /* translators: the label over this site's MCP address, as ChatGPT names that field; the step above names it too, so use the same word. */
                        'url' => \__('Connection', 'extendify-local'),
                    ],
                ],
                [
                    /* translators: heading of the setup step, where the person approves the assistant here. */
                    'title' => \__('Approve access', 'extendify-local'),
                    'substeps' => [
                        /* translators: the quoted checkbox and Create are ChatGPT labels. */
                        \__(
                            'Check <strong>I understand and want to continue</strong>, then click <strong>Create</strong>.',
                            'extendify-local'
                        ),
                        /* translators: Sign in with is the start of a ChatGPT button label. */
                        \__('Click <strong>Sign in with</strong> followed by your app\'s name.', 'extendify-local')
                            . ' ' . self::approveOnSite('ChatGPT'),
                        /* translators: describes the ChatGPT page shown after approving; nothing on it needs changing. */
                        \__(
                            'You\'ll be taken back to ChatGPT, to the app\'s page listing its permissions. You don\'t need to change anything.',
                            'extendify-local'
                        ),
                    ],
                ],
                [
                    /* translators: heading of the last setup step, where the connection is used in a chat. */
                    'title' => \__('Use it in a chat', 'extendify-local'),
                    'text' => [
                        /* translators: @ is typed in ChatGPT's message box; + and More are its chat menu labels. In right-to-left languages, write the arrow as ←. */
                        \__(
                            'Start a new chat, type <strong>@</strong> and pick your site, or open <strong>+</strong> → <strong>More</strong>.',
                            'extendify-local'
                        ),
                        \__('ChatGPT asks before it changes anything on your site.', 'extendify-local'),
                    ],
                ],
            ],
        ];
    }
    // phpcs:enable Generic.Files.LineLength.TooLong

    /**
     * @return array
     */
    private static function anythingElse()
    {
        return [
            'id' => 'other',
            /* translators: the picker tile for any assistant not listed by name, beside Claude and ChatGPT. */
            'name' => \__('Other', 'extendify-local'),
            'gate' => [
                'tone' => 'ok',
                /* translators: MCP is a protocol name; keep it in English. */
                'text' => \__(
                    'Works with any AI assistant that can connect to a remote MCP server.',
                    'extendify-local'
                ),
            ],
            'steps' => [
                [
                    /* translators: heading of a setup step for an assistant not listed by name. */
                    'title' => \__('Add this site\'s address to your assistant', 'extendify-local'),
                    /* translators: MCP is a protocol name; keep it in English. */
                    'text' => \__(
                        'In your assistant\'s MCP or connector settings, add a remote server with this address.',
                        'extendify-local'
                    ),
                    'fields' => [
                        /* translators: the label over this site's MCP address. MCP is a protocol name. */
                        'url' => \__('MCP server URL', 'extendify-local'),
                    ],
                ],
                [
                    /* translators: heading of an optional setup step: the assistant configures itself. */
                    'title' => \__('Or let it set itself up', 'extendify-local'),
                    /* translators: coding tools are AI assistants that run in a code editor or a terminal. */
                    'text' => \__(
                        'Assistants that can change their own settings, like coding tools, can use this prompt.',
                        'extendify-local'
                    ),
                    'fields' => ['prompt' => ''],
                ],
                [
                    /* translators: heading of the setup step, where the person approves the assistant here. */
                    'title' => \__('Approve access', 'extendify-local'),
                    /* translators: Approve is the button on this site's own sign-in page. */
                    'text' => \__(
                        'You\'ll be taken to WordPress. Sign in if prompted, then click <strong>Approve</strong>.',
                        'extendify-local'
                    ),
                ],
            ],
        ];
    }
}
