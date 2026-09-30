import { z } from 'zod';

// get-home
const patternShape = z.looseObject({
	name: z.string(),
	code: z.string(),
	patternTypes: z.array(z.string()),
	contentGenerated: z.boolean().optional(),
	navSlug: z.string().optional(),
	navLabel: z.string().optional(),
	blogImages: z.array(z.string()).optional(),
	images: z.array(z.string()).optional(),
});
export const homeTemplateShape = z.looseObject({
	id: z.string(),
	slug: z.string(),
	headerCode: z.string().optional(),
	footerCode: z.string().optional(),
	patterns: z.array(patternShape),
});
export const getHomeShape = z.looseObject({
	home: homeTemplateShape,
});

// get-images
const libraryImageShape = z.looseObject({ url: z.string() });
export const getImagesShape = z.looseObject({
	siteImages: z.object({
		hero: z.array(libraryImageShape).default([]),
		general: z.array(libraryImageShape).default([]),
	}),
});

// get-logo
export const getLogoShape = z.looseObject({
	logoUrl: z.url(),
});

// get-pages
export const pageTemplateShape = z.looseObject({
	id: z.string(),
	slug: z.string(),
	name: z.string(),
	patterns: z.array(patternShape),
	siteStyle: z.object(),
});
export const getPagesShape = z.looseObject({
	pages: z.array(pageTemplateShape),
});

// get-plugins
export const pluginShape = z.looseObject({
	name: z.string(),
	wordpressSlug: z.string(),
});
export const getPluginsShape = z.object({
	sitePlugins: z.array(pluginShape),
});

// get-profile
export const socialProfilesShape = z.looseObject({
	facebook: z.string().nullish(),
	instagram: z.string().nullish(),
	x: z.string().nullish(),
	tiktok: z.string().nullish(),
});
export const getProfileShape = z.looseObject({
	type: z.string(),
	title: z.string(),
	description: z.string(),
	descriptionRaw: z.string().optional(),
	objective: z.string(),
	category: z.string().optional(),
	structure: z.string(),
	imageSearchTerms: z.array(z.string()),
	tone: z.array(z.string()),
	logoObjectName: z.string(),
	products: z.union([z.string(), z.literal(false)]),
	appointments: z.boolean(),
	events: z.boolean(),
	donations: z.boolean(),
	multilingual: z.boolean(),
	contact: z.boolean(),
	address: z.union([z.boolean(), z.string()]),
	blog: z.boolean(),
	landingPage: z.boolean(),
	landingPageCTALink: z.union([z.literal(false), z.string()]),
	phoneNumber: z.union([z.boolean(), z.string()]).optional(),
	email: z.string().nullish(),
	socialProfiles: socialProfilesShape.nullish(),
});

// get-launch-decisions
export const getLaunchDecisionsShape = z.looseObject({
	navExtras: z.string().optional(),
	navButtonLabel: z.string().optional(),
});

// get-strings
export const getStringsShape = z.looseObject({
	aiHeaders: z.array(z.string()),
	aiBlogTitles: z.array(z.string()),
	heroDescription: z.string().optional(),
});

// get-style
export const styleShape = z.looseObject({
	vibe: z.string(),
	fonts: z.looseObject(),
	variation: z.looseObject(),
	colorPalette: z.string(),
	animation: z.string(),
});
export const getStyleShape = z.object({
	siteStyle: styleShape.extend({ variation: z.looseObject().optional() }),
});

// get-design-build
const designBuildShape = z.looseObject({
	siteProfile: getProfileShape,
	pages: z.array(
		z.object({
			slug: z.string(),
			name: z.string(),
			description: z.string().optional(),
		}),
	),
	siteStyle: styleShape.omit({ variation: true }),
	selectedPlugins: z.array(pluginShape),
	logoUrl: z.url().nullish(),
	templateParts: z.looseObject({
		header: z.string().nullish(),
		footer: z.string().nullish(),
	}),
	builtPages: z.array(
		z.object({
			slug: z.string(),
			fullPage: z.boolean(),
			patterns: z.array(patternShape),
		}),
	),
});
export const getDesignBuildShape = designBuildShape;
