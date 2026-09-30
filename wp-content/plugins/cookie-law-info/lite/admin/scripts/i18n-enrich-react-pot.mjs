/**
 * Adds extracted (#. translators:) comments to the merged React POT.
 * react-gettext-parser reads dist/js/index.js where bundlers strip comments, so
 * wp i18n make-pot --merge would otherwise warn on every sprintf-style string.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { po } from 'gettext-parser';

// This file lives in lite/admin/scripts/ — plugin languages/ is three levels up.
const potPath = join(dirname(fileURLToPath(import.meta.url)), '../../../languages/.tmp-admin-react.pot');

if (!existsSync(potPath)) {
  console.error(`i18n-enrich-react-pot: missing ${potPath} (run react-gettext-parser first)`);
  process.exit(1);
}

/** msgid (decoded) -> text after "#. " (include "translators:" prefix for GlotPress / WP tooling). */
const EXTRACTED_BY_MSGID = {
  'Pageviews will reset on<br><b>%1$s</b>.<br><a class="cky-external-link cky:text-inherit! cky:underline!" href="%2$s" target="_blank">Learn more</a>':
    'translators: 1: Date when pageviews reset. 2: URL of the documentation page.',
  'The cookie <b>%1$s</b> will be permanently deleted. This cookie will no longer be displayed on your cookie list nor be blocked prior to receiving user consent.':
    'translators: %1$s: Cookie name.',
  'Your trial subscription will be cancelled at the end of your billing period on <b>%s</b>, and your site will be removed from the web app account':
    'translators: %s: End date of the billing period (formatted).',
  'Your subscription will be cancelled at the end of your billing period on <b>%s</b>, and your site will be removed from the web app account.':
    'translators: %s: End date of the billing period (formatted).',
  "Your cookie banner is currently inactive. Add a payment method to start your 14-day free trial and activate your banner. If you don't proceed with the trial by <b>%s</b>, your site will be removed from the web app account":
    'translators: %s: Last date to add a payment method (formatted).',
  'Add a payment method before the next renewal date, <b>%s</b>, to avoid suspension of your site. If no payment method is added by this date, your site will be removed from the web app account within 30 days of suspension.':
    'translators: %s: Next renewal date (formatted).',
  "Your cookie banner is currently inactive. Choose a plan to activate your banner and unlock advanced customisation and features. If you don't proceed with a plan by <b>%s</b>, your site will be removed from the web app account.":
    'translators: %s: Last date to choose a plan (formatted).',
  "Your site is currently suspended and your cookie banner is inactive due to payment failure. Complete your payment to activate the banner. If you don't proceed with the payment by <b>%s</b>, your site will be removed from the web app account":
    'translators: %s: Last date to complete payment (formatted).',
  '%1$sNote:%2$s To use the standalone plugin, you can <a href="%3$s">disconnect</a> from the web app. However, you\'ll lose advanced features and customizations.':
    'translators: %1$s: opening bold tag, %2$s: closing bold tag, %3$s: settings page URL.',
  'Unable to reach your web app account at the moment. Please reload the page to retry. If the issue persists, check out the <a href="%s" target="_blank">common issues causing this error</a> and try applying the suggested solutions.':
    'translators: %s: URL of the troubleshooting documentation page.',
  'Looks like your website URL has changed. To ensure the proper functioning of your banner, update the registered URL on your CookieYes account (navigate to the <a href="%1$s" target="_blank">Organisations &amp; Sites</a> page and click the More button associated with your site). Then, reload this page to retry. If the issue persists, please <a href="%2$s" target="_blank">contact us</a>.':
    'translators: %1$s: URL to the Organisations & Sites page. %2$s: URL to contact support.',
  'By specifying "All", consent will apply to all regions. You can specify a comma-separated list of <a href="%1$s" target="_blank" class="cky:font-semibold">regions</a> to apply consent to specific regions.':
    'translators: %1$s: URL to the ISO 3166-2 regions reference (Wikipedia).',
  'If the third-party script setting this cookie is %1$s then you can specify its "Script URL Pattern" as <b>%2$s</b>':
    'translators: %1$s: Example third-party script tag shown as escaped text. %2$s: Example Script URL Pattern hostname.',
  "The <b>%1$s</b> language and any translations you've added in this language will be permanently deleted.":
    'translators: %1$s: Language name.',
  'Banner closes automatically in %d s...':
    'translators: %d: Seconds remaining before the banner preview closes.',
  '+ %1$s%2$s per 1,000 extra pageviews*':
    'translators: %1$s: Currency symbol. %2$s: Price per 1,000 extra pageviews.',
  '*Extra pageviews are automatically enabled for users who created their CookieYes account on or after %s. Users who created their account before this date can enable it anytime from Billing & Invoices. ':
    'translators: %s: Release date when extra pageviews became automatically enabled.',
  'Only %1$d day left in your %2$s trial':
    'translators: %1$d: number of days remaining in the trial, %2$s: plan name.',
  "🎉 You're on a 14-day %s trial":
    'translators: %s: plan name.',
  "To avoid losing access to advanced features after the trial ends, add payment details now and continue on the %s plan seamlessly. You won't be charged until your trial ends.":
    'translators: %s: plan name.',
  "To keep your cookie banner active after the trial, add payment details now and continue on the %s plan seamlessly. You won't be charged until your trial ends.":
    'translators: %s: plan name.',
  "Your %1$s features are active until %2$s. After that, your plan will be downgraded to Free unless you add payment details. You won't be charged until your trial ends.":
    'translators: %1$s: plan name, %2$s: trial end date.',
  "Your %1$s features are active until %2$s. After that, your cookie banner will be paused unless you add payment details. You won't be charged until your trial ends.":
    'translators: %1$s: plan name, %2$s: trial end date.',
};

const raw = readFileSync(potPath, 'utf8');
const catalog = po.parse(raw);
const table = catalog.translations[''] || {};

let added = 0;
const missing = [];
for (const [msgid, extracted] of Object.entries(EXTRACTED_BY_MSGID)) {
  const entry = table[msgid];
  if (!entry) {
    missing.push(msgid.slice(0, 80));
    continue;
  }
  if (entry.comments?.extracted) {
    continue;
  }
  entry.comments = entry.comments || {};
  entry.comments.extracted = extracted;
  added += 1;
}

if (missing.length > 0) {
  console.warn(
    `i18n-enrich-react-pot: ${missing.length} map key(s) not in POT (update EXTRACTED_BY_MSGID if intentional):\n  ${missing.join('\n  ')}`
  );
}

writeFileSync(potPath, po.compile(catalog), 'utf8');
console.log(`i18n-enrich-react-pot: added ${added} extracted translator comment(s)`);
