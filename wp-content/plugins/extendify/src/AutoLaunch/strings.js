import { __, sprintf } from '@wordpress/i18n';

// A partner names anything; two shipped entries are functions a string would break.
const partnerOverrides = (shipped) =>
	Object.fromEntries(
		Object.entries(window.extLaunchData?.partnerStrings ?? {}).filter(
			([key, value]) => value && typeof shipped[key] === 'string',
		),
	);

/**
 * A function, not an object: `__` at module scope runs before WordPress has
 * registered the locale data, and the strings come back in English.
 */
export const launchStrings = () => {
	const shipped = {
		heading: __('Describe the website you want to build', 'extendify-local'),
		titleLabel: __('Website title (required)', 'extendify-local'),
		titlePlaceholder: __('Enter your website name', 'extendify-local'),
		descriptionLabel: __('Describe your website', 'extendify-local'),
		// translators: "Enhance with AI" refers to improving the current input using AI.
		enhance: __('Enhance with AI', 'extendify-local'),
		updating: __('Updating your site', 'extendify-local'),
		updatingNote: __(
			"We're installing the latest updates. Please don't close this window — it will only take a moment.",
			'extendify-local',
		),
		stalled: __('We are experiencing some delays', 'extendify-local'),
		stalledNote: __('Pausing for a few seconds', 'extendify-local'),
		documentTitle: __('Launch - AI-Powered Web Creation', 'extendify-local'),
		exitLink: __('WP Admin Dashboard', 'extendify-local'),
		back: __('Back', 'extendify-local'),
		submit: __('Next', 'extendify-local'),
		submitAlternate: __('Create website', 'extendify-local'),
		placeholder: __(
			'E.g., A personal photography portfolio featuring a collection of landscape, portrait, and street photography, capturing moments from around the world.',
			'extendify-local',
		),
		placeholderAlternate: __(
			'E.g., A boutique law firm specializing in family law, estate planning, and real estate, offering trusted, personalized counsel to clients across the region.',
			'extendify-local',
		),
		reviewing: __('Reviewing your description...', 'extendify-local'),
		enhancing: __('Enhancing the website description...', 'extendify-local'),
		needsThemeTitle: __('One more thing before we start.', 'extendify-local'),
		needsThemeBody: __(
			'Launch requires the Extendable theme to work. You can install it from the link below and start over once activated.',
			'extendify-local',
		),
		needsThemeAction: __('Take me there', 'extendify-local'),
		restartTitle: __('Start Over?', 'extendify-local'),
		restartBody: __(
			'It looks like you have been here before. We need to clean up some things before we can continue.',
			'extendify-local',
		),
		restartNote: (count) =>
			sprintf(
				// translators: %s is the number of old pages
				__('%s pages/posts will be deleted.', 'extendify-local'),
				count,
			),
		restartExit: __('Exit', 'extendify-local'),
		restartConfirm: __('Delete and start over', 'extendify-local'),
		migrateTitle: __(
			'How would you like to start your website?',
			'extendify-local',
		),
		migrateHeading: __('Move a site you already have', 'extendify-local'),
		migrateBody: __('Import an existing WordPress website', 'extendify-local'),
		migrateAction: __('Migrate website', 'extendify-local'),
		buildHeading: __('Create a brand new site', 'extendify-local'),
		buildBody: __(
			'Create a beautiful website in about a minute',
			'extendify-local',
		),
		buildAction: __('Build a new website', 'extendify-local'),
		buildBadge: __('Most Popular', 'extendify-local'),
		migrationSearch: __('migration', 'extendify-local'),
		connectorTitle: __('How would you like to build this?', 'extendify-local'),
		connectorBody: __(
			'Based on what you described, your site may need some advanced functionality.',
			'extendify-local',
		),
		wordpressHeading: __('Keep building with WordPress', 'extendify-local'),
		wordpressBody: __(
			'Great for business sites, e-commerces, landing pages, portfolios, and blogs.',
			'extendify-local',
		),
		wordpressAction: __('Build with WordPress', 'extendify-local'),
		connectorBadge: __('Recommended for you', 'extendify-local'),
		statusBooting: __('Booting things up', 'extendify-local'),
		statusProfile: __('Creating a site profile', 'extendify-local'),
		statusStyle: __('Picking the perfect design', 'extendify-local'),
		statusDesign: __('Loading your design', 'extendify-local'),
		statusIdeas: __('Generating site content ideas', 'extendify-local'),
		statusImages: __('Finding the perfect images', 'extendify-local'),
		statusLogo: __('Generating a logo', 'extendify-local'),
		statusHome: __('Preparing your home page', 'extendify-local'),
		statusPages: __('Preparing your pages', 'extendify-local'),
		statusPlugins: __('Setting up site functionality', 'extendify-local'),
		statusFunctionality: __(
			'Setting up functionality for your website',
			'extendify-local',
		),
		statusAdmin: __('Adding admin configurations', 'extendify-local'),
		statusFonts: __('Installing fonts locally', 'extendify-local'),
		statusSiteStyle: __('Setting the website style', 'extendify-local'),
		statusNavigation: __('Working on the navigation', 'extendify-local'),
		statusLanding: __('Perfecting a landing page', 'extendify-local'),
		statusCreatingPages: __('Creating pages', 'extendify-local'),
		statusBlog: __('Creating blog sample data', 'extendify-local'),
		statusStore: __('Setting up your online store', 'extendify-local'),
		statusDone: __('All done!', 'extendify-local'),
		statusAddingPage: (name) =>
			// translators: %s is the name of the page being added
			sprintf(__('Adding page: %s', 'extendify-local'), name),
		errorUnstable: __(
			'The network seems unstable. Retrying...',
			'extendify-local',
		),
		errorStep: __(
			'Having some trouble with this step. Trying again...',
			'extendify-local',
		),
		errorFinalSteps: __(
			'Something went wrong during the final steps. We will try again but you may need to refresh the page.',
			'extendify-local',
		),
	};

	return { ...shipped, ...partnerOverrides(shipped) };
};
