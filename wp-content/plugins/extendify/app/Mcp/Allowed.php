<?php

/**
 * What a connection may reach, and how far the partner opened it.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

use Extendify\PartnerData;

/**
 * The partner opens the surface with two dials and two lists, all sent by the
 * backend. An install that has never heard back from it reaches nothing.
 *
 * mcpConfig holds the dials, read and write, each none, some or all. Read is
 * the off switch: none there turns connections off and closes writes with it.
 * At all, nothing is checked against a list.
 *
 * At some, a list names what is reachable, spelled as the tool or ability is
 * named. mcpReadList holds our read tools by name (list_posts) and ability
 * namespaces as ability:<namespace>, which admits every ability there that
 * annotates itself readonly. mcpWriteList holds our write tools by name and
 * abilities one at a time as <namespace>/<ability>. A write ability also needs
 * its namespace on the read list: readonly is the plugin's own claim, so
 * nothing a plugin registers reaches a connection until the read list names it.
 *
 * A few tools skip the lists and are offered whenever connections are on.
 */
class Allowed
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    const NONE = 'none';

    const SOME = 'some';

    const ALL = 'all';

    const NAMESPACE_PREFIX = 'ability:';

    const ALWAYS_OFFERED = ['request_feature'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * @return string
     */
    public static function reads()
    {
        return self::dial('read');
    }

    /**
     * @return string
     */
    public static function writes()
    {
        return self::reads() === self::NONE ? self::NONE : self::dial('write');
    }

    /**
     * Whether the partner turned on a write that a connection could reach.
     *
     * @return boolean
     */
    public static function writable()
    {
        if (self::writes() === self::ALL) {
            return true;
        }

        if (self::writes() !== self::SOME) {
            return false;
        }

        foreach (self::listed('mcpWriteList') as $entry) {
            if (strpos($entry, '/') === false || self::readsNamespace(self::namespaceOf($entry))) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param string $name        - The ability name, namespace first.
     * @param array  $annotations - The ability's meta annotations.
     * @return string|null - The grant the ability needs, or null when no connection reaches it.
     */
    public static function forAbility($name, array $annotations = [])
    {
        if (!self::readsNamespace(self::namespaceOf($name))) {
            return null;
        }

        if (!empty($annotations['readonly'])) {
            return Grants::READ;
        }

        return self::forTool($name, Grants::WRITE) ? Grants::WRITE : null;
    }

    /**
     * @param string $name - The tool or ability name.
     * @param string $mode - The grant the tool declares it needs.
     * @return boolean
     */
    public static function forTool($name, $mode = Grants::WRITE)
    {
        if (self::reads() !== self::NONE && in_array((string) $name, self::ALWAYS_OFFERED, true)) {
            return true;
        }

        $reach = $mode === Grants::WRITE ? self::writes() : self::reads();
        if ($reach === self::ALL) {
            return true;
        }

        $list = $mode === Grants::WRITE ? 'mcpWriteList' : 'mcpReadList';

        return $reach === self::SOME && in_array((string) $name, self::listed($list), true);
    }

    /**
     * @param string $namespace - The ability's namespace.
     * @return boolean
     */
    private static function readsNamespace($namespace)
    {
        if (self::reads() === self::ALL) {
            return true;
        }

        return self::reads() === self::SOME
            && in_array(self::NAMESPACE_PREFIX . $namespace, self::listed('mcpReadList'), true);
    }

    /**
     * @param string $name - An ability name, or a write list entry naming one.
     * @return string
     */
    private static function namespaceOf($name)
    {
        return explode('/', (string) $name)[0];
    }

    /**
     * @param string $side - read or write.
     * @return string
     */
    private static function dial($side)
    {
        $config = PartnerData::setting('mcpConfig');
        $reach = is_array($config) ? ($config[$side] ?? '') : '';

        return in_array($reach, [self::SOME, self::ALL], true) ? $reach : self::NONE;
    }

    /**
     * @param string $setting - The partner setting holding a list of names.
     * @return array
     */
    private static function listed($setting)
    {
        $named = PartnerData::setting($setting);
        if (!is_array($named)) {
            return [];
        }

        // A hand-typed entry may carry a leading slash that no tool or ability name has.
        return array_map(function ($entry) {
            return ltrim((string) $entry, '/');
        }, $named);
    }
}
