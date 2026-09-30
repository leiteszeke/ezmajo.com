<?php

namespace Extendify\QuickEdit\Schemas;

defined('ABSPATH') || die('No direct access.');

interface Schema
{
    /**
     * @return array<int, array{key:string,control:string,label:string,options?:array}>
     */
    public function fields(): array;

    /**
     * @param array  $block    parse_blocks() shape
     * @param string $fieldKey
     * @param mixed  $value
     * @return array mutated block (also parse_blocks() shape)
     */
    public function apply(array $block, string $fieldKey, $value): array;
}
