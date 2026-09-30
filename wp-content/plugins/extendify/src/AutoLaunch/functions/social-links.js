const SOCIAL_SERVICES = ['facebook', 'instagram', 'x', 'tiktok'];

const SOCIAL_LINK_RE = /<!--\s*wp:social-link\s+(\{[^}]*\})\s*\/-->/g;
const SOCIAL_LINKS_BLOCK_RE =
	/<!--\s*wp:social-links\b[^>]*>[\s\S]*?<!--\s*\/wp:social-links\s*-->/g;

const hasScrapedSocial = (profiles) =>
	!!profiles && SOCIAL_SERVICES.some((key) => profiles[key]);

export const applySocialProfiles = (code, profiles) => {
	if (!code || !hasScrapedSocial(profiles)) return code;

	return code.replace(SOCIAL_LINKS_BLOCK_RE, (block) => {
		let keepCount = 0;
		const updated = block.replace(SOCIAL_LINK_RE, (match, attrs) => {
			const service = attrs.match(/"service":"([^"]+)"/)?.[1];
			const url = SOCIAL_SERVICES.includes(service) ? profiles[service] : null;
			if (!url) return '';
			keepCount++;
			const newAttrs = attrs.replace(
				/"url":"[^"]*"/,
				`"url":${JSON.stringify(url)}`,
			);
			return match.replace(attrs, newAttrs);
		});
		return keepCount === 0 ? '' : updated;
	});
};
