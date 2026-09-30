import { __ } from '@wordpress/i18n';
import {
	footer,
	header,
	Icon,
	navigation,
	page,
	plugins,
	post,
	reusableBlock,
	styles,
} from '@wordpress/icons';
import classNames from 'classnames';

const { themeSlug, adminUrl, devbuild, isBlockTheme, useAgentOnboarding } =
	window.extSharedData;
const { hasCustomizer, editSiteNavigationMenuLink } = window.extAssistData;

const showRestartLaunch =
	devbuild || window.extAssistData.canSeeRestartLaunch || false;

export const QuickLinks = ({ className }) => {
	const quickLinks = [
		{
			title: __('Add new page', 'extendify-local'),
			link: `${adminUrl}post-new.php?post_type=page`,
			slug: 'add-new-page',
			icon: page,
			show: true,
		},
		{
			title: __('Add new post', 'extendify-local'),
			link: `${adminUrl}post-new.php`,
			slug: 'add-new-post',
			icon: post,
			show: true,
		},
		{
			title: __('Explore plugins', 'extendify-local'),
			link: `${adminUrl}plugin-install.php`,
			slug: 'explore-plugins',
			icon: plugins,
			show: true,
		},
		{
			title: __('Site style', 'extendify-local'),
			link: `${adminUrl}site-editor.php?path=%2Fwp_global_styles`,
			slug: 'site-style',
			icon: styles,
			show: isBlockTheme,
		},
		{
			title: __('Site style', 'extendify-local'),
			link: `${adminUrl}customize.php?return=%2Fwp%2Fwp-admin%2Fadmin.php%3Fpage%3Dextendify-assist`,
			slug: 'site-style-classic',
			icon: styles,
			show: hasCustomizer && !isBlockTheme,
		},
		{
			title: __('Edit header', 'extendify-local'),
			link: `${adminUrl}site-editor.php?postId=extendable%2F%2Fheader&postType=wp_template_part&canvas=edit`,
			slug: 'edit-header',
			icon: header,
			show: themeSlug === 'extendable',
		},
		{
			title: __('Edit footer', 'extendify-local'),
			link: `${adminUrl}site-editor.php?postId=extendable%2F%2Ffooter&postType=wp_template_part&canvas=edit`,
			slug: 'edit-footer',
			icon: footer,
			show: themeSlug === 'extendable',
		},
		{
			title: __('Edit site navigation', 'extendify-local'),
			link: editSiteNavigationMenuLink,
			slug: 'edit-site-navigation',
			icon: navigation,
			show: true,
		},
		{
			// translators: "Reset site" refers to the action of resetting the user's WordPress site to a fresh state.
			title: __('Reset site', 'extendify-local'),
			link: useAgentOnboarding
				? `${adminUrl}admin.php?page=extendify-auto-launch`
				: `${adminUrl}admin.php?page=extendify-launch`,
			slug: 'reset-site',
			icon: reusableBlock,
			show: showRestartLaunch && themeSlug === 'extendable',
		},
	];

	return (
		<div
			data-test="assist-quick-links-module"
			id="assist-quick-links-module"
			className={classNames(
				className,
				'h-full w-full rounded-sm border border-gray-300 bg-white p-5 text-base lg:p-8',
			)}
		>
			<h2 className="mb-4 mt-0 text-lg font-semibold">
				{__('Quick Links', 'extendify-local')}
			</h2>
			<div className="grid place-items-start gap-x-6 md:grid-flow-col md:grid-rows-2">
				{quickLinks
					.filter((item) => item.show)
					.map((item) => (
						<a
							key={item.slug}
							href={item.link}
							title={item.title}
							data-test={`assist-quick-links-module-${item.slug}`}
							className="flex items-center justify-center py-1.5 text-sm text-gray-800 no-underline hover:text-design-main hover:underline hover:underline-offset-2"
						>
							<Icon
								icon={item.icon}
								className="mr-2 fill-current rtl:ml-2 rtl:mr-auto"
							/>
							<span className="mr-1">{item.title}</span>
						</a>
					))}
			</div>
		</div>
	);
};
