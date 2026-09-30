import { useTasksStore } from '@assist/state/tasks';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const { useAgentOnboarding } = window.extSharedData;

const autoLaunch = {
	title: __("Let's Start Building Your Website", 'extendify-local'),
	description: __(
		'Create a super-fast, beautiful, and fully customized site in minutes with our Site Launcher.',
		'extendify-local',
	),
	buttonText: __('Create your site now', 'extendify-local'),
};

const launchSteps = {
	'website-objective': {
		step: __('Website Objective', 'extendify-local'),
		title: __("Let's Start Building Your Website", 'extendify-local'),
		description: __(
			'Create a super-fast, beautiful, and fully customized site in minutes with our Site Launcher.',
			'extendify-local',
		),
		buttonText: __('Add Website Objective', 'extendify-local'),
	},
	'site-information': {
		step: __('Site Industry', 'extendify-local'),
		title: __('Continue Building Your Website', 'extendify-local'),
		description: __(
			'Create a super-fast, beautiful, and fully customized site in minutes with our Site Launcher.',
			'extendify-local',
		),
		buttonText: __('Add Website Details', 'extendify-local'),
	},
	'site-structure': {
		step: __('Site Structure', 'extendify-local'),
		title: __('Continue Building Your Website', 'extendify-local'),
		description: __(
			'Create a super-fast, beautiful, and fully customized site in minutes with our Site Launcher.',
			'extendify-local',
		),
		buttonText: __('Pick Your Site Structure', 'extendify-local'),
	},
	layout: {
		step: __('Design', 'extendify-local'),
		title: __('Continue Building Your Website', 'extendify-local'),
		description: __(
			'Create a super-fast, beautiful, and fully customized site in minutes with our Site Launcher.',
			'extendify-local',
		),
		buttonText: __('Select Site Design', 'extendify-local'),
	},
	'page-select': {
		step: __('Pages', 'extendify-local'),
		title: __('Continue Building Your Website', 'extendify-local'),
		description: __(
			'Create a super-fast, beautiful, and fully customized site in minutes with our Site Launcher.',
			'extendify-local',
		),
		buttonText: __('Select Site Pages', 'extendify-local'),
	},
};

const getCurrentLaunchStep = () => {
	const pageData = JSON.parse(
		localStorage.getItem(`extendify-pages-${window.extSharedData.siteId}`),
	) || { state: {} };
	const currentPageSlug = pageData?.state?.currentPageSlug;

	// If their last step doesn't exist in our options, just use step 1
	if (!Object.keys(launchSteps).includes(currentPageSlug)) {
		return 'website-objective';
	}

	return currentPageSlug;
};

export const LaunchCard = ({ task }) => {
	const [currentStep, setCurrentStep] = useState();
	const { dismissTask } = useTasksStore();

	useEffect(() => {
		if (currentStep) return;
		setCurrentStep(getCurrentLaunchStep());
	}, [currentStep]);

	const stepData = useAgentOnboarding ? autoLaunch : launchSteps[currentStep];

	const launchUrl = `${window.extSharedData.adminUrl}admin.php?page=${
		useAgentOnboarding ? 'extendify-auto-launch' : 'extendify-launch'
	}`;

	return (
		<div className="h-full justify-center overflow-hidden bg-white/95 text-base">
			<div className="flex h-full flex-col items-center justify-center gap-5 p-7 text-center md:p-8">
				{task?.htmlBefore()}
				<div className="flex h-full flex-col items-center justify-center text-center lg:justify-between">
					<div>
						<h2 className="mb-2 text-2xl font-semibold leading-10 md:mt-0 lg:text-2xl">
							{stepData?.title}
						</h2>
						<p className="m-0 text-sm md:text-base">{stepData?.description}</p>
					</div>
					<div className="cta mt-6 flex flex-wrap items-center text-sm md:gap-3 lg:mt-3">
						<a
							href={launchUrl}
							className="min-w-24 cursor-pointer rounded-xs bg-design-main px-4 py-2.5 text-sm font-medium text-design-text no-underline hover:opacity-90"
						>
							{stepData?.buttonText}
						</a>
						<button
							type="button"
							id="dismiss"
							onClick={() => {
								dismissTask('site-builder-launcher');
							}}
							className="bg-transparent text-sm text-design-main underline-offset-4 hover:underline"
						>
							{__('Dismiss', 'extendify-local')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
