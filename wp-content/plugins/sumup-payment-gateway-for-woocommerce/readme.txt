=== SumUp Payment Gateway For WooCommerce ===
Contributors: sumup
Tags: sumup, payment gateway, woocommerce, payments, ecommerce
Requires at least: 6.9
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 2.17.1
License: Apache-2.0
License URI: https://www.apache.org/licenses/LICENSE-2.0

The SumUp plugin for WooCommerce allows businesses to securely process payments online. Accept payments from customers using a range of payment methods.

== Description ==

Accept online payments in WooCommerce with SumUp.

This plugin adds SumUp as a payment gateway for WooCommerce stores. It supports standard checkout flows, redirect-based payment confirmation, and WooCommerce Cart and Checkout Blocks.

= Features =
* Accept card payments with SumUp in WooCommerce
* Support eligible alternative payment methods enabled on the merchant account
* Compatible with WooCommerce Cart and Checkout Blocks
* Compatible with High-Performance Order Storage (HPOS)
* Update WooCommerce orders based on SumUp checkout status and webhooks

= Supported payment methods =
* Cards: Visa, VPay, Mastercard, American Express, Diners Club, Discover
* Alternative payment methods: Apple Pay, Bancontact, Boleto, iDEAL, PayPal, Sofort

Availability depends on the merchant account configuration and country support.

= Supported currencies =
AUD, BRL, BGN, CLP, COP, CZK, DKK, EUR, HUF, NOK, GBP, RON, SEK, CHF, USD, PLN

= Supported languages =
Bulgarian, Czech, Danish, Dutch, English, Estonian, Finnish, French, German, Greek, Hungarian, Italian, Latvian, Lithuanian, Norwegian, Polish, Portuguese, Romanian, Slovak, Slovenian, Spanish, Swedish

= Documentation =
Setup guide: https://developer.sumup.com/online-payments/plugins/woocommerce/

== Screenshots ==

1. The settings panel used to configure the gateway
2. The new simplified connection workflow with "Connect Account"
3. A checkout with SumUp

== Installation ==

= Automated installation =

Automatic installation is the easiest option, as WordPress handles the file transfer and you do not need to leave the browser.
Before starting, ensure WooCommerce is already installed and active.

1. Install the plugin via the "Plugins" section in the Dashboard
2. Click on "Add new" and search for "SumUp Payment Gateway for WooCommerce"
3. Click "Install Now"
4. Click "Activate"
5. Go to `WooCommerce > Settings > Payments > SumUp`
6. Use "Connect Account" to link the merchant account
7. Verify the remaining settings before accepting live payments

= Manual Installation =

The manual installation method involves downloading the plugin and uploading it to the web server via FTP or a hosting file manager. WordPress provides instructions for manual plugin installation in its support documentation.

== Frequently Asked Questions ==

= Does it work with debit and credit card? =

Yes. You'll be able to accept Visa, VPay, Mastercard, American Express, Diners Club, Discover cards.

= What currencies does the plugin support? =

Supported currencies are AUD, BRL, BGN, CLP, COP, CZK, DKK, EUR, HUF, NOK, GBP, RON, SEK, CHF, USD, and PLN.

= Which Alternative Payment Methods (APMs) are supported? =

Depending on merchant account configuration and country support, SumUp can process Apple Pay, Bancontact, Boleto, iDEAL, PayPal, and Sofort.

= How can I enable Alternative Payment Methods (APMs)? =

Alternative payment methods must be enabled for the merchant account by SumUp.

= Where can I find documentation? =

You can find setup documentation here: https://developer.sumup.com/online-payments/plugins/woocommerce/

= Where can I get support if needed? =

If you need help with setup or testing, contact SumUp support through the official support channels for your merchant account.

= Does this support both production mode and sandbox mode for testing? =

Yes. Test the integration fully before enabling live payments.

== Changelog ==
= 2.17.1 =
* Fixed: Restored payment failure and pending messaging after redirect flows in both classic checkout and Checkout Blocks.
* Fixed: Prevented classic checkout redirect validation from being misclassified as Blocks checkout.
* Fixed: Checkout Blocks now uses localized payment error messages from plugin translations.
* Fixed: Improved SumUp widget handling for invalid, failed, and error payment responses.

= 2.17.0 =
* Improved: Used the WordPress modal component for Checkout Blocks.
* Improved: Refined the classic checkout modal styling and accessibility.
* Fixed: Restored classic checkout modal initialization with bundled scripts.

= 2.16.4 =
* Fixed: Stopped passing deprecated amount and currency configuration to the SumUp Card Widget and now rely on showAmount with checkout data fetched by checkout ID.
* Fixed: Made fresh installations honor the default "Open Payment in modal?" setting before the settings page is saved.
* Fixed: Kept the inline SumUp checkout widget hidden after checkout creation failures so customers do not see an empty payment box.

= 2.16.3 =
* Fixed: Restored amount and currency in SumUp Card Widget initialization to prevent blank card fields on checkout.

= 2.16.2 =
* Fixed: Made modal payment handling more reliable.
* Fixed: Saved settings now persist correctly after updates.
* Improvements: Added extra request headers for checkout and onboarding requests.

= 2.16.1 =
* Fixed: Made checkout form resolution prefer the current WooCommerce helper first, while keeping compatibility with legacy checkout event payloads.

= 2.16.0 =
* Fixed: Automatically migrate legacy stores that still have `pay_to_email` but no `merchant_code` by fetching the merchant code from SumUp user info.
* Fixed: Restored widget and checkout compatibility for older connections during the 2.15.0 migration.

= 2.15.0 =
* Fixed: Stopped sending `pay_to_email` to the SumUp widget and now use `merchant_code` consistently.
* Improvements: Updated setup copy and localized strings to refer to “Merchant code” everywhere.

= 2.14.0 =
* Improvements: The plugin now requires a public site hostname before starting the hosted onboarding flow, which avoids failed connections on local or private addresses.
* Fixed: Improved the account connection and disconnect flow, including correct website URL handling during setup.

= 2.13.0 =
* Improvements: Added more detailed observability and debugging logs across checkout and connection flows.
* Improvements: Hardened the order-pay widget initialization and flow so stored orders reopen more reliably.
* Fixed: Preserved checkout binding during redirect payments and refreshed stale checkouts more safely.
* Fixed: Strengthened webhook handling, checkout validation, and WooCommerce Blocks order binding.
* Fixed: Stored pending Pix and Boleto payment instructions on the order for later retrieval.
* Fixed: Redacted sensitive provider HTTP data from logs and improved fallback handling on thank-you pages.

= 2.12.0 =
* Fixed: Prevented onboarding responses without a valid redirect URL from sending merchants to `/wp-admin/undefined`.
* Fixed: Made the WooCommerce onboarding callback more reliable by persisting pending connection IDs across the full account-linking flow.
* Fixed: Added clearer logging when the website callback rejects a connection so support can diagnose onboarding failures faster.

= 2.11.0 =
* Improvements: Updated the SumUp settings page to make it easier to understand and manage.
* Improvements: Added a dedicated Connection section showing the connected account details and account actions.
* Improvements: Reorganized settings into clearer sections for connection, checkout, payment options, and diagnostics.
* Improvements: Refreshed the SumUp branding and onboarding visuals in the plugin.
* Fixed: After connecting a SumUp account, merchants are now taken to the proper settings screen instead of being asked to connect again.
* Fixed: Improved the loading state of the Connect and Disconnect buttons in the plugin settings.
* Fixed: Improved the layout of the SumUp payment method in WooCommerce Checkout Blocks so the logo and label stay aligned.
* New: Added a local example environment and documentation to make development and testing easier.

= 2.10.0 =
* Fixed: Improved reliability when processing payment updates and webhooks from SumUp.
* Fixed: Reduced unnecessary background tasks that could increase database usage over time.
* Fixed: Improved compatibility with WooCommerce Checkout Blocks.
* Fixed: Restored the “Powered by SumUp” footer when opening the payment widget in a modal.
* Improvements: Updated the plugin build and test setup to support more reliable releases.

= 2.9.1 =
* Fixed: Optimized ActionScheduler webhook processing to prevent excessive database growth.
* Fixed: Implemented deduplication for webhook actions and stabilized group identifiers.
* Fixed: Improved retry logic to avoid unnecessary attempts on failed checkout status. 

= 2.9.0 =
* Fixed: Add compatibility for Woocommerce Checkout blocks
* Fixed: Show footer on widget open in modal.

= 2.8.2 =
* Fixed: website connection issues and improved plugin onboarding flow.

= 2.8.0 =
* Improvement: Improvements to the security system.

= 2.7.12 =
* Fixed: Fixed Fatal error when wc-countries is null.

= 2.7.11 =
* Fixed: Fixed showed payment buttons on paid orders.

= 2.7.10 =
* Fixed: Improvement in overall security.

= 2.7.9 =
* Fixed: Fixed the update of new checkout data in the payment modal.

= 2.7.8 =
* Fixed: Change onboarding endpoint.

= 2.7.7 =
* Improvement: Added log to checkout created.
* Fixed: Fixed deprecated warning, declare dynamic property.

= 2.7.6 =
* Fixed: Fixed webhook priority process on schedule_actions.

= 2.7.5 =
* Fixed: Fixed a credential validation error in the onboarding flow.

= 2.7.4 =
* Improvement: Added structured error logging with mapped error codes.
* Improvement: Applied background security improvements.

= 2.7.3 =
* Improvement: Introduce mapped error logging.

= 2.7.2 =
* Fixed: Fixed a credential validation error in the onboarding flow
* Fixed: Fixed an issue with order validation
* Fixed: Improved the account connection and disconnection flows

= 2.7.1 =
* Fixed: Record settings on onboarding flow.

= 2.7.0 =
* Improvements: Updated onboarding flow.
* Fixed: Duplicate in the notes of orders.

= 2.6.9 =
* Improvements: Security for plugin integration with Sumup.

= 2.6.8 =
* Fixed: Show the updated images on the plugin page information.

= 2.6.7 =
* Improvements: Updated plugin page information.

= 2.6.6 =
* Improvements: Removed deprecated hooks from code.
* Fixed: Automatic redirect on checkout payment.

= 2.6.5 =
* Fixed: SumUp SDK loading conflict with certain themes.

= 2.6.4 =
* Improvements: Minor security update.

= 2.6.3 =
* Fixed: Script loading outside of checkout.
* Improved: Error messages.

= 2.6.2 =
* Fixed: Error when using Apple pay in the Woocommerce blocks checkout.

= 2.6.1 =
* Fixed: Create checkout woocommerce blocks error.

= 2.6.0 =
* Fixed: Onbarding does not work when site is in maintenance mode.

= 2.5.9 =
* Fixed: Visual and styling conflicts with other plugins/themes.

= 2.5.8 =
* Fixed: SumUp SDK import when using WooCommerce Blocks.

= 2.5.7 =
* Improvements: Added translation for the plugin to all supported locales.
* Fixed: Apple Pay redirect after checkout payment.
* Fixed: Order status updating to 'Completed' after payment for checkouts with Virtual and Downloadable products.

= 2.5.6 =
* Improvements: Support for Australian Dollar (AUD).

= 2.5.5 =
* Fixed: Warning PHP message.
* Fixed: Message diff currency appearing before update.

= 2.5.3 =
* Improvements: Added support for WooCommerce checkout blocks.
* Fixed: Warning message when there is a currency mismatch between WooCommerce and the SumUp account.
* Fixed: Pix payment appearing even when disabled in the plugin settings.

= 2.5.2 =
* Improvements: Support for Wordpress 6.5.2.
* Fixed: Critical error when saving settings.

= 2.5 =
* New: Onbording to connect with SumUp account.
* Improvements: Compatibility with WordPress 6.4.
* Fixed: Automatic redirect to success page without payment being processed.
* Fixed: Update order status after payment conclusion.

= 2.4.2 =
* Fixed: In some flows order status can be updated two times.
* Fixed: error to get country from checkout.
* Fixed: validation of credentials on settings.
* Improvements: add more details to logs.
* Improvements: compatibility with WordPress 6.4.

= 2.4.1 =
* Improvements: error message during setup.

= 2.4 =
* Improvements: do not hide the card widget on submit if has any invalid data.
* Improvements: flow to validate payments with redirect (like 3Ds).

= 2.3 =
* Improvements: credentials validation on plugin settings.

= 2.2 =
* Improvements: Update order status to cancelled when 3Ds validation failed.
* Improvements: Logs during checkout.

= 2.1 =
* Fixed: 3Ds payments redirect.
* Fixed: webhook order confirmation.
* Fixed: card widget close when clicked on it (modal disabled).

= 2.0 =
* New: Accept payments with alternative payment methods (Follow guides for enabling in your account)
* New: Accept card payments with installments in BR.
* New: Accept payments with Apple Pay.
* New: Support for WooCommerce stock management feature
* New: New user experience configuration: merchant can choose to open the payment option in a pop-up instead of the checkout page.
* Improvements: Display WooCommerce order Id on SumUp Sales History.
* Improvements: Added transaction code to order description on WooCommerce
* Improvements: Added checkout_id in order notes to improve customer support
* Improvements: New settings screen for easier setup
* Improvements: Multiple code maintenance improvements.
* Improvements: Support for Wordpress 6.3
* Improvements: Require PHP version 7.2 or greater.
* Fixed: Errors during checkout that caused duplicated payment.
* Fixed: Issues loading payment methods on checkout.
* Fixed: Issue with customer creation during checkout that caused duplicated payment.

= 1.2 =
* Changed: Checkout improvement.
* Changed: WooCommerce order id in description.

= 1.1 =
* New: Added new currencies.
* New: Checkout-id on payment form.
* Changed: Rephrase Error messages.

= 1.0 =
* Initial release.

== Upgrade Notice ==

= 2.17.1 =
* Patch release that fixes redirect payment messaging and checkout failure handling for classic and Blocks checkout.

= 2.17.0 =
* Minor release improving modal behavior and checkout compatibility.

= 2.16.4 =
* Patch release that uses showAmount for card payments, honors modal defaults on fresh installs, and hides failed inline payment fields.

= 2.16.3 =
* Patch release that restores checkout widget initialization for card payments.

= 2.16.2 =
* Patch release that improves modal payment handling, keeps updated settings from being lost, and adds extra request headers.

= 2.16.1 =
* Patch release for WooCommerce checkout compatibility. It now prefers the current helper object while falling back to the legacy event argument.

= 2.16.0 =
* Patch release that keeps 2.15.0's merchant-code migration, while restoring compatibility for legacy `pay_to_email` connections.

= 2.15.0 =
* A minor release that standardizes on Merchant code and removes the legacy `pay_to_email` widget payload.

= 2.14.0 =
* Requires a public site hostname for hosted onboarding and improves the account connection and disconnect flow.
