import { whenEditorIsReady } from '@shared/lib/wp';
import '@page-creator/page-creator.css';
import { hasPageCreatorEnabled } from '@help-center/lib/utils';
import { MainButton } from '@page-creator/components/MainButton';
import { Modal } from '@page-creator/components/Modal';
import { render } from '@shared/lib/dom';

const isPageCreatorEnabled = () => {
	return (
		hasPageCreatorEnabled &&
		window.wp.data.select('core/editor').getCurrentPostType() === 'page'
	);
};

whenEditorIsReady().then(() => {
	if (!isPageCreatorEnabled()) return;

	const id = 'extendify-page-creator-btn';
	const className = 'extendify-page-creator';
	const page = '.editor-document-tools';
	// const fse = '.edit-site-header-edit-mode__start';
	if (document.getElementById(id)) return;
	const btnWrap = document.createElement('div');
	const btn = Object.assign(btnWrap, { id, className });
	render(<MainButton />, btn);
	setTimeout(() => {
		document.querySelector(page)?.after(btn);
		// document.querySelector(fse)?.append(btn);
	}, 300);

	const mdl = 'extendify-page-creator-modal';
	if (document.getElementById(mdl)) return;
	const modalWrap = document.createElement('div');
	const modal = Object.assign(modalWrap, { id: mdl, className });
	document.body.append(modal);
	render(<Modal />, modal);
});
