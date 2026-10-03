<?php

/**
 * The tools a connection is offered, and the calls they make.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

/**
 * The model supplies arguments and never a path. Abilities a plugin registers
 * after we ship are reachable without a plugin release.
 */
class Surface
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    /**
     * Model APIs cap a tool name at 64 characters.
     */
    const MAX_NAME = 64;

    /**
     * A client validates the schema it is handed, and a plugin may write keys JSON Schema lacks.
     */
    const SCHEMA_KEYWORDS = [
        'additionalProperties',
        'anyOf',
        'const',
        'default',
        'description',
        'enum',
        'exclusiveMaximum',
        'exclusiveMinimum',
        'format',
        'items',
        'maxItems',
        'maxLength',
        'maximum',
        'minItems',
        'minLength',
        'minimum',
        'multipleOf',
        'oneOf',
        'pattern',
        'properties',
        'required',
        'title',
        'type',
        'uniqueItems',
    ];

    const HINTS = [
        'readonly' => 'readOnlyHint',
        'destructive' => 'destructiveHint',
        'idempotent' => 'idempotentHint',
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * @param array $grants - What the connection is allowed to do.
     * @return array
     */
    public static function tools(array $grants)
    {
        $tools = [];
        foreach (self::offered($grants) as $tool) {
            $tools[] = $tool['definition'];
        }

        return $tools;
    }

    /**
     * @param array $params     - The tools/call params.
     * @param array $grants     - What the connection is allowed to do.
     * @param array $connection - The connection the call arrived on.
     * @return array|\WP_Error
     */
    public static function call(array $params, array $grants, array $connection = [])
    {
        $name = (string) ($params['name'] ?? '');
        $started = microtime(true);
        $outcome = ['outcome' => 'error', 'error' => ''];

        try {
            $offered = self::offered($grants);
            if (!isset($offered[$name])) {
                $outcome = ['outcome' => 'refused', 'error' => sprintf('Unknown tool: %s', $name)];

                return new \WP_Error('extendify_mcp_unknown_tool', $outcome['error']);
            }

            $tool = $offered[$name];
            $arguments = is_array($params['arguments'] ?? null) ? $params['arguments'] : [];

            $answered = Guard::during(function () use ($tool, $arguments) {
                return isset($tool['handler'])
                    ? self::handled($tool, $arguments)
                    : self::answer(\rest_do_request(self::abilityRequest($tool, $arguments)), $tool);
            });
            $outcome = self::outcome($answered);

            return $answered;
        } catch (Refused $refused) {
            $outcome = ['outcome' => 'refused', 'error' => $refused->getMessage()];

            return self::problem($refused->getMessage());
        } catch (\Throwable $failed) {
            // Uncaught, this is WordPress's critical-error page, which no client can parse.
            $outcome = ['outcome' => 'error', 'error' => $failed->getMessage()];

            return self::problem(sprintf('%s failed: %s', $name, $failed->getMessage()));
        } finally {
            $outcome['duration'] = microtime(true) - $started;
            Log::write($connection, $name, $outcome);
        }
    }

    /**
     * @param mixed $answered - What the tool answered with.
     * @return array
     */
    private static function outcome($answered)
    {
        if (!is_array($answered) || empty($answered['isError'])) {
            return ['outcome' => 'ok', 'error' => ''];
        }

        return ['outcome' => 'error', 'error' => (string) ($answered['content'][0]['text'] ?? '')];
    }

    /**
     * @param array $grants - What the connection is allowed to do.
     * @return array
     */
    public static function offered(array $grants)
    {
        $offered = [];
        foreach (array_merge(self::written($grants), self::abilities($grants)) as $tool) {
            $name = $tool['definition']['name'];
            if (!isset($offered[$name])) {
                $offered[$name] = $tool;
            }
        }

        return $offered;
    }

    /**
     * @param array $grants - What the connection is allowed to do.
     * @return array
     */
    private static function written(array $grants)
    {
        $tools = [];
        foreach (Tools::all() as $name => $tool) {
            if (!in_array($tool['mode'], $grants, true)) {
                continue;
            }

            if (!Allowed::forTool($name, $tool['mode'])) {
                continue;
            }

            // Clients treat a tool without readOnlyHint as a write and ask before every call.
            $definition = [
                'name' => $name,
                'description' => $tool['description'],
                'inputSchema' => $tool['inputSchema'],
                'annotations' => ['readOnlyHint' => $tool['mode'] === Grants::READ] + ($tool['annotations'] ?? []),
            ];

            $tools[] = [
                'mode' => $tool['mode'],
                'handler' => $tool['handler'],
                'definition' => $definition,
            ];
        }

        return $tools;
    }

    /**
     * @param array $tool      - The tool being called.
     * @param array $arguments - The arguments the client called with.
     * @return array
     */
    private static function handled(array $tool, array $arguments)
    {
        $arguments = self::valid($tool['definition']['inputSchema'], $arguments);
        if (\is_wp_error($arguments)) {
            return self::problem($arguments->get_error_message());
        }

        $answered = call_user_func([Handlers::class, $tool['handler']], $arguments);

        return \is_wp_error($answered) ? self::problem($answered->get_error_message()) : self::json($answered);
    }

    /**
     * A model that reads why its arguments were turned down can correct itself.
     *
     * @param array $schema    - The tool's input schema.
     * @param array $arguments - The arguments the client called with.
     * @return array|\WP_Error
     */
    private static function valid(array $schema, array $arguments)
    {
        // A client needs {} for a tool taking nothing, and the validator fatals indexing a stdClass.
        $schema['properties'] = (array) ($schema['properties'] ?? []);
        foreach ($schema['properties'] as $key => $property) {
            if (!isset($arguments[$key]) && array_key_exists('default', (array) $property)) {
                $arguments[$key] = $property['default'];
            }
        }

        $checked = \rest_validate_value_from_schema($arguments, $schema, 'arguments');
        if (\is_wp_error($checked)) {
            return $checked;
        }

        return (array) \rest_sanitize_value_from_schema($arguments, $schema, 'arguments');
    }

    /**
     * @param string $message - What went wrong, for the model to read.
     * @return array
     */
    private static function problem($message)
    {
        return ['content' => [['type' => 'text', 'text' => $message]], 'isError' => true];
    }

    /**
     * @param array $grants - What the connection is allowed to do.
     * @return array
     */
    private static function abilities(array $grants)
    {
        if (!function_exists('wp_get_abilities')) {
            return [];
        }

        $tools = [];
        foreach (\wp_get_abilities() as $ability) {
            if (!$ability->get_meta_item('show_in_rest')) {
                continue;
            }

            $annotations = (array) $ability->get_meta_item('annotations');
            $mode = Allowed::forAbility($ability->get_name(), $annotations);
            if ($mode === null || !in_array($mode, $grants, true)) {
                continue;
            }

            $tools[] = self::ability($ability, $annotations, $mode);
        }

        return $tools;
    }

    /**
     * The run controller insists on the method an ability's annotations imply.
     *
     * @param \WP_Ability $ability     - The registered ability.
     * @param array       $annotations - Its meta annotations.
     * @param string      $mode        - The grant it needs.
     * @return array
     */
    private static function ability($ability, array $annotations, $mode)
    {
        $method = 'POST';
        if (!empty($annotations['readonly'])) {
            $method = 'GET';
        } elseif (!empty($annotations['destructive']) && !empty($annotations['idempotent'])) {
            $method = 'DELETE';
        }

        // An ability may branch its whole input with oneOf rather than name properties.
        $schema = self::normalize($ability->get_input_schema());
        $schema['type'] = 'object';

        $definition = [
            'name' => self::name($ability->get_name()),
            'description' => $ability->get_description(),
            'inputSchema' => $schema,
        ];
        $output = self::normalize($ability->get_output_schema());
        if (($output['type'] ?? '') === 'object') {
            $definition['outputSchema'] = $output;
        }

        $hints = self::hints($annotations);
        if ($hints) {
            $definition['annotations'] = $hints;
        }

        return [
            'mode' => $mode,
            'method' => $method,
            'ability' => $ability->get_name(),
            'definition' => $definition,
        ];
    }

    /**
     * WordPress leaves an annotation null, and an absent hint takes MCP's default.
     *
     * @param array $annotations - The ability's meta annotations.
     * @return array
     */
    private static function hints(array $annotations)
    {
        $hints = [];
        foreach (self::HINTS as $annotation => $hint) {
            if (isset($annotations[$annotation])) {
                $hints[$hint] = (bool) $annotations[$annotation];
            }
        }

        return $hints;
    }

    /**
     * The run controller reads input from the query except on a POST.
     *
     * @param array $tool      - The tool being called.
     * @param array $arguments - The arguments the client called with.
     * @return \WP_REST_Request
     */
    private static function abilityRequest(array $tool, array $arguments)
    {
        $request = new \WP_REST_Request($tool['method'], '/wp-abilities/v1/abilities/' . $tool['ability'] . '/run');
        if ($tool['method'] !== 'POST') {
            $request->set_query_params(['input' => $arguments]);

            return $request;
        }

        $request->set_header('Content-Type', 'application/json');
        $request->set_body(\wp_json_encode(['input' => (object) $arguments]));

        return $request;
    }

    /**
     * @param \WP_REST_Response $response - What the REST server answered.
     * @param array             $tool     - The tool that was called.
     * @return array
     */
    private static function answer($response, array $tool)
    {
        $data = $response->get_data();
        $answer = self::json($data);
        if ($response->is_error()) {
            $answer['isError'] = true;

            return $answer;
        }

        // A tool that named an output schema owes the client a result shaped like it.
        if (isset($tool['definition']['outputSchema']) && (is_array($data) || is_object($data))) {
            $answer['structuredContent'] = (object) $data;
        }

        return $answer;
    }

    /**
     * @param mixed $data - What the tool answered with.
     * @return array
     */
    private static function json($data)
    {
        $text = \wp_json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

        return ['content' => [['type' => 'text', 'text' => $text]]];
    }

    /**
     * @param mixed $schema - A schema as a plugin registered it.
     * @return array
     */
    private static function normalize($schema)
    {
        if (!is_array($schema)) {
            return [];
        }

        $kept = array_intersect_key($schema, array_flip(self::SCHEMA_KEYWORDS));
        if (isset($kept['required']) && !is_array($kept['required'])) {
            unset($kept['required']);
        }

        if (isset($kept['properties']) && is_array($kept['properties'])) {
            $kept = array_merge($kept, self::describe($kept));
        }

        if (isset($kept['items'])) {
            $kept['items'] = self::normalize($kept['items']);
        }

        foreach (['oneOf', 'anyOf'] as $branch) {
            if (isset($kept[$branch]) && is_array($kept[$branch])) {
                $kept[$branch] = array_map([self::class, 'normalize'], $kept[$branch]);
            }
        }

        return $kept;
    }

    /**
     * A plugin may spell required on the property, as a REST arg does; a client wants it on the object.
     *
     * @param array $schema - A schema whose properties need normalizing.
     * @return array
     */
    private static function describe(array $schema)
    {
        $properties = [];
        $required = isset($schema['required']) ? $schema['required'] : [];
        foreach ($schema['properties'] as $name => $property) {
            if (!is_array($property)) {
                continue;
            }

            if (!empty($property['required'])) {
                $required[] = (string) $name;
            }

            $properties[$name] = self::normalize($property);
        }

        $described = ['properties' => (object) $properties];
        if ($required) {
            $described['required'] = array_values(array_unique($required));
        }

        return $described;
    }

    /**
     * @param string $subject - The ability name.
     * @return string
     */
    private static function name($subject)
    {
        $name = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '_', $subject), '_'));
        if (strlen($name) <= self::MAX_NAME) {
            return $name;
        }

        return substr($name, 0, self::MAX_NAME - 9) . '_' . substr(md5($name), 0, 8);
    }
}
