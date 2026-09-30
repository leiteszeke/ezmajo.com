/**
 * WordPress gettext extractor for compiled JS bundles.
 * Replaces the deprecated react-gettext-parser CLI.
 *
 * Usage: node scripts/i18n-extract-react.mjs --config <cfg> --output <out> <file...>
 */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { po } from 'gettext-parser';
import { parse } from 'acorn';

// Plugin root is 3 levels up from lite/admin/scripts/
const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

let currentRef = '';

const args = process.argv.slice(2);
let configPath, outputPath;
const inputFiles = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--config') configPath = args[++i];
  else if (args[i] === '--output') outputPath = args[++i];
  else inputFiles.push(args[i]);
}

if (!configPath || !outputPath || inputFiles.length === 0) {
  console.error('Usage: i18n-extract-react.mjs --config <config> --output <output> <file...>');
  process.exit(1);
}

const req = createRequire(import.meta.url);
const config = req(resolve(configPath));
const funcMap = config.funcArgumentsMap || {};
const sourceType = config.sourceType || 'module';

// Key: msgctxt\x04msgid (or just msgid when no context)
const entries = {};

function stringValue(node) {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0)
    return node.quasis[0]?.value?.cooked ?? null;
  return null;
}

function addEntry({ msgid, msgid_plural, msgctxt }) {
  if (typeof msgid !== 'string' || !msgid) return;
  const tableKey = msgctxt ? `${msgctxt}\x04${msgid}` : msgid;
  if (entries[tableKey]) return;
  entries[tableKey] = {
    msgid,
    msgstr: msgid_plural ? ['', ''] : [''],
    ...(msgid_plural ? { msgid_plural } : {}),
    ...(msgctxt ? { msgctxt } : {}),
    ...(currentRef ? { comments: { reference: currentRef } } : {}),
  };
}

function walk(node) {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'CallExpression') {
    const { callee, arguments: callArgs = [] } = node;
    let name = null;
    if (callee.type === 'Identifier') name = callee.name;
    else if (callee.type === 'MemberExpression' && callee.property?.type === 'Identifier')
      name = callee.property.name;

    if (name && Object.prototype.hasOwnProperty.call(funcMap, name)) {
      const argKeys = funcMap[name]; // e.g. ['msgid', 'msgctxt'] or ['msgid', 'msgid_plural']
      const entry = {};
      argKeys.forEach((key, i) => {
        if (key) entry[key] = stringValue(callArgs[i]);
      });
      addEntry(entry);
    }
  }

  for (const val of Object.values(node)) {
    if (Array.isArray(val)) val.forEach((child) => walk(child));
    else if (val && typeof val === 'object' && val.type) walk(val);
  }
}

for (const file of inputFiles) {
  currentRef = relative(PLUGIN_ROOT, resolve(file));
  const source = readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(source, { ecmaVersion: 'latest', sourceType });
  } catch (err) {
    console.error(`Failed to parse ${file}: ${err.message}`);
    process.exit(1);
  }
  walk(ast);
}

const catalog = {
  charset: 'utf-8',
  headers: {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Transfer-Encoding': '8bit',
  },
  translations: { '': { '': { msgid: '', msgstr: [''] }, ...entries } },
};

writeFileSync(outputPath, po.compile(catalog));
console.log(`i18n-extract-react: extracted ${Object.keys(entries).length} strings to ${outputPath}`);
