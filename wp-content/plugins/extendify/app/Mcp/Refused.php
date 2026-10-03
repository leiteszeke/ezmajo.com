<?php

/**
 * Thrown when a tool call tries something a connection may not do.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

/**
 * A pre_update_option filter can only return a value, so refusing means throwing.
 */
class Refused extends \RuntimeException
{
}
