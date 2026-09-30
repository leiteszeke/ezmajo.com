import { MainButton } from '@library/components/MainButton';
import { Modal } from '@library/components/Modal';
import { render } from '@shared/lib/dom';
import '@library/library.css';
import { whenEditorIsReady } from '@shared/lib/wp';

whenEditorIsReady().then(() => {
	const id = 'extendify-library-btn';
	const className = 'extendify-library';
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

	const mdl = 'extendify-library-modal';
	if (document.getElementById(mdl)) return;
	const modalWrap = document.createElement('div');
	const modal = Object.assign(modalWrap, { id: mdl, className });
	document.body.append(modal);
	render(<Modal />, modal);
});
