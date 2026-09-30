import { fetchBlockCodeById } from '@agent/lib/block-code';
import { buildBlockSchema } from '@agent/lib/block-schema';
import { INSERTABLE_BLOCK_TYPES } from '@agent/lib/insertable-blocks';
import { ensureCoreBlocksRegistered } from '@agent/lib/register-blocks';
import { useQuickEditStore } from '@quick-edit/state/store';
import { getBlockType, parse } from '@wordpress/blocks';

// Each picked block's code + per-type schemas, the same shape the single path
// ships up front; `blockTypes` fetches by name for adds not yet on the page.
export default async ({ blockIds = [], blockTypes = [] }) => {
	await ensureCoreBlocksRegistered();
	const { agentBlock } = useQuickEditStore.getState();
	const postId = window.extAgentData?.context?.postId;

	const blocks = (
		await Promise.all(
			blockIds.map(async (blockId) => {
				const code = await fetchBlockCodeById(
					blockId,
					agentBlock?.source,
					postId,
				);
				return { blockId, type: parse(code)[0]?.name, code };
			}),
		)
	).filter(({ type }) => type);

	const schemaByType = {};
	for (const { type } of blocks) {
		schemaByType[type] ??= buildBlockSchema(getBlockType(type));
	}
	for (const type of blockTypes) {
		if (!INSERTABLE_BLOCK_TYPES.includes(type)) continue;
		schemaByType[type] ??= buildBlockSchema(getBlockType(type));
	}
	// Typed so each patch validates against its own block's fields.
	return {
		blocks,
		blockSchemas: Object.entries(schemaByType)
			.filter(([, schema]) => schema)
			.map(([type, schema]) => ({ type, schema })),
	};
};
