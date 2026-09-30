import { publishesSite } from './publish-site';
import { Bar } from './templates/Bar';
import { Card } from './templates/Card';
import { Pill } from './templates/Pill';
import { Pricing } from './templates/Pricing';

export const SLOTS = {
	ADMIN_DASHBOARD: 'admin-dashboard',
	ADMIN_OTHERS: 'admin-others',
	ADMIN_ASSIST: 'admin-assist',
	ADMIN_MODAL: 'admin-modal',
	AGENT_CHAT: 'agent-chat',
	FRONTEND_BOTTOM: 'frontend-bottom',
	FRONTEND_TOPBAR: 'frontend-topbar',
	FRONTEND_MODAL: 'frontend-modal',
};

// agent-chat is null because the Agent renders it as a chat suggestion.
const TEMPLATES = {
	[SLOTS.ADMIN_DASHBOARD]: Card,
	[SLOTS.ADMIN_OTHERS]: Card,
	[SLOTS.ADMIN_ASSIST]: Card,
	[SLOTS.ADMIN_MODAL]: Pricing,
	[SLOTS.AGENT_CHAT]: null,
	[SLOTS.FRONTEND_BOTTOM]: Bar,
	[SLOTS.FRONTEND_TOPBAR]: Pill,
	[SLOTS.FRONTEND_MODAL]: Pricing,
};

export const templateFor = (slot) => TEMPLATES[slot] ?? null;

// A trial-block modal is the paywall, so without an offer there is nothing to show.
const hasOfferWhenBlocking = (notification) =>
	notification.trigger !== 'trial-block' || Boolean(notification.offer);

// Deciding this inside Pill would count a view for a pill that never rendered.
const REQUIREMENTS = {
	[SLOTS.FRONTEND_TOPBAR]: (notification, href) =>
		// A publishing pill has no href; it acts in place on click.
		Boolean(notification['cta-label'] && (href || publishesSite(notification))),
	[SLOTS.ADMIN_MODAL]: hasOfferWhenBlocking,
	[SLOTS.FRONTEND_MODAL]: hasOfferWhenBlocking,
};

export const fillsSlot = (slot, notification, href) =>
	REQUIREMENTS[slot]?.(notification, href) ?? true;

// The pill stays as the persistent reminder after the bar is dismissed.
const DISMISSAL_EXEMPT = [SLOTS.FRONTEND_TOPBAR];

export const ignoresDismissal = (slot) => DISMISSAL_EXEMPT.includes(slot);
