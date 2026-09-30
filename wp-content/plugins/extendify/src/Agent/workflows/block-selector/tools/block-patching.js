import { fetchBlockCodeById } from '@agent/lib/block-code';
import { applyBlockPatch } from '@agent/lib/block-patch';
import { buildNewBlock } from '@agent/lib/insertable-blocks';
import { ensureCoreBlocksRegistered } from '@agent/lib/register-blocks';
import { swapBlockImage } from '@agent/lib/replace-image';
import { SETTING_TEXT_BLOCKS } from '@agent/lib/setting-text-blocks';
import { useQuickEditStore } from '@quick-edit/state/store';
import apiFetch from '@wordpress/api-fetch';

// clear lists attributes to reset — null in a patch means "no change", not "remove".
const buildEdit = async ({ blockId, patch, clear }, source, postId) => {
	const previousContent = await fetchBlockCodeById(blockId, source, postId);
	if (!previousContent) return null;
	const presetSlugs = window.extAgentData?.context?.presetSlugs ?? {};
	const blockCode = applyBlockPatch(
		previousContent,
		patch,
		clear ?? [],
		presetSlugs,
	);
	if (blockCode === previousContent) return null;
	return { op: 'edit', blockId, block: blockCode };
};

const buildAdd = ({ anchorId, position, blockType, patch, clear }) => {
	const presetSlugs = window.extAgentData?.context?.presetSlugs ?? {};
	const block = buildNewBlock(blockType, patch, clear ?? [], presetSlugs);
	if (!block) return null;
	return { op: 'add', anchorId, position, block };
};

// The backend op has no image — the confirm UI attaches it before the tool runs.
const buildReplaceImage = async ({ blockId, image }, source, postId) => {
	if (!image) return null;
	const previousContent = await fetchBlockCodeById(blockId, source, postId);
	if (!previousContent) return null;
	const blockCode = swapBlockImage(previousContent, image);
	if (!blockCode || blockCode === previousContent) return null;
	return { op: 'edit', blockId, block: blockCode };
};

const BUILDERS = {
	edit: buildEdit,
	'replace-image': buildReplaceImage,
	delete: ({ blockId }) => ({ op: 'delete', blockId }),
	move: ({ blockId, targetId, position }) => ({
		op: 'move',
		blockId,
		targetId,
		position,
	}),
	wrap: ({ blockId, container }) => ({ op: 'wrap', blockId, container }),
	add: buildAdd,
};

const writeSetting = (data) =>
	apiFetch({ path: '/wp/v2/settings', method: 'POST', data });

// The text belongs in the option row; the rest of the patch is block markup.
const settingTextBridge = (setting) => (operation) => {
	const { text, ...attrs } = operation?.patch ?? {};
	if (text == null) return null;
	return {
		commit: () => writeSetting({ [setting]: text }),
		rest: Object.keys(attrs).length ? { ...operation, patch: attrs } : null,
	};
};

// Content living outside the block markup gets a per-block-type bridge, which
// returns the part of the op it didn't consume — null when it handles nothing.
// An option row has no rollback, so `commit` waits for the block save.
const CONTENT_BRIDGES = {
	'core/site-logo': {
		'replace-image': ({ image }) =>
			image?.id
				? { commit: () => writeSetting({ site_logo: image.id }), rest: null }
				: null,
	},
	...Object.fromEntries(
		Object.entries(SETTING_TEXT_BLOCKS).map(([blockType, setting]) => [
			blockType,
			{ edit: settingTextBridge(setting) },
		]),
	),
};

export default async (input) => {
	await ensureCoreBlocksRegistered();
	const operations = Array.isArray(input?.operations) ? input.operations : [];
	if (!operations.length) return { refused: true, reason: 'no-block' };

	const { agentBlock } = useQuickEditStore.getState();
	const source = agentBlock?.source;
	const { postId } = window.extAgentData?.context ?? {};
	const bridges = CONTENT_BRIDGES[agentBlock?.blockType] ?? {};
	const bridged = operations.map((operation) =>
		bridges[operation?.op] ? bridges[operation.op](operation) : null,
	);
	const results = await Promise.all(
		operations.map((operation, index) => {
			const remaining = bridged[index] ? bridged[index].rest : operation;
			return remaining
				? BUILDERS[remaining?.op]?.(remaining, source, postId)
				: null;
		}),
	);

	const built = results.filter(Boolean);
	// A no-op build must surface, or the reply claims a change that never happened.
	const dropped = operations
		.filter(
			(operation, index) => operation && !results[index] && !bridged[index],
		)
		.map(({ blockId }) => ({ blockId, reason: 'no-change' }));
	if (!built.length && !bridged.some(Boolean)) {
		return { refused: true, reason: 'no-op' };
	}

	let applied = [];
	let refused = [];
	if (built.length) {
		const scope =
			source?.kind === 'template-part'
				? { partSlug: source.partSlug }
				: { postId };
		({ applied = [], refused = [] } = await apiFetch({
			path: '/extendify/v1/agent/update-blocks',
			method: 'POST',
			data: { ...scope, operations: built },
		}));
		if (!applied.length) return { refused: true, reason: 'not-applied' };
	}

	// An option row has no rollback, so a bridge waits on its own op, not the batch.
	const landed = new Set(applied.map(({ blockId }) => String(blockId)));
	const committed = [];
	for (const [index, entry] of bridged.entries()) {
		if (!entry) continue;
		if (results[index] && !landed.has(String(operations[index].blockId))) {
			continue;
		}
		await entry.commit();
		committed.push({ op: operations[index].op });
	}

	// Not `refused`: Agent.jsx reads any truthy `refused` — even [] — as a refusal.
	return {
		ok: true,
		applied: [...committed, ...applied],
		refusedOperations: [...refused, ...dropped],
	};
};
