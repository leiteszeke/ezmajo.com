import { useCanvasSeat } from '@agent/components/Canvas';
import { DOMHighlighter } from '@agent/components/DOMHighlighter';
import { CanvasModalLayout } from '@agent/components/layouts/CanvasModalLayout';
import { DragResizeLayout } from '@agent/components/layouts/DragResizeLayout';
import { MobileLayout } from '@agent/components/layouts/MobileLayout';
import { DESKTOP_MIN_WIDTH, useGlobalStore } from '@agent/state/global';
import { useEditModeStore } from '@quick-edit/state/edit-mode';
import { useQuickEditStore } from '@quick-edit/state/store';
import { useEffect } from '@wordpress/element';
import { SidebarLayout } from './components/layouts/SidebarLayout';

export const Chat = ({ busy, working, children }) => {
	const { setIsMobile, isMobile, mode } = useGlobalStore();
	const canvasModal = useCanvasSeat() === 'modal';
	const editModeOn = useEditModeStore((s) => s.on);
	const block = useQuickEditStore((s) => s.agentBlock);
	const setBlock = useQuickEditStore((s) => s.setAgentBlock);

	useEffect(() => {
		if (!isMobile || !block) return;
		// Remove the block if we switch to mobile
		setBlock(null);
	}, [isMobile, setIsMobile, block, setBlock]);

	useEffect(() => {
		let timeout;
		const onResize = () => {
			clearTimeout(timeout);
			timeout = window.setTimeout(() => {
				setIsMobile(window.innerWidth < DESKTOP_MIN_WIDTH);
			}, 10);
		};
		window.addEventListener('resize', onResize);
		return () => {
			clearTimeout(timeout);
			window.removeEventListener('resize', onResize);
		};
	}, [setIsMobile]);

	if (isMobile) {
		return (
			<MobileLayout>
				<div
					id="extendify-agent-chat"
					className="flex min-h-0 flex-1 grow flex-col font-sans"
				>
					{children}
				</div>
			</MobileLayout>
		);
	}

	if (canvasModal) {
		return (
			<>
				{/* The docked panel holds the page's offset, so it stays behind. */}
				{mode === 'docked-left' ? <SidebarLayout /> : null}
				<CanvasModalLayout>
					<div
						id="extendify-agent-chat"
						className="flex min-h-0 flex-1 grow flex-col font-sans"
					>
						{children}
					</div>
				</CanvasModalLayout>
			</>
		);
	}

	if (mode === 'docked-left') {
		return (
			<SidebarLayout>
				<div
					id="extendify-agent-chat"
					className="flex min-h-0 flex-1 grow flex-col font-sans"
				>
					{children}
				</div>
				{editModeOn && <DOMHighlighter busy={busy} working={working} />}
			</SidebarLayout>
		);
	}

	return (
		<DragResizeLayout>
			<div
				id="extendify-agent-chat"
				className="flex min-h-0 flex-1 grow flex-col font-sans"
			>
				{children}
			</div>
			{editModeOn && <DOMHighlighter busy={busy} working={working} />}
		</DragResizeLayout>
	);
};
