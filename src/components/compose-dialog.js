import { html } from 'lit';
import { connect } from 'pwa-helpers/connect-mixin.js';

// This element is connected to the Redux store.
import { store } from '../store.js';

import { DialogElement } from './dialog-element.js';

import { ButtonSharedStyles } from './button-shared-styles.js';

import {
	selectComposeOpen,
	selectPromptContent,
	selectPromptMessage,
} from '../selectors.js';

import {
	composeCancel,
	composeUpdateContent,
	composeCommit,
} from '../actions/prompt.js';

import {
	CHECK_CIRCLE_OUTLINE_ICON
} from './my-icons.js';

class ComposeDialog extends connect(store)(DialogElement) {
	innerRender() {
		return html`
			${ButtonSharedStyles}
			<style>
				textarea {
					flex-grow:1;
					width:100%;
				}
				.buttons {
					display:flex;
					flex-direction: row;
					justify-content:flex-end;
				}
				h3 {
					font-weight:normal;
				}
			</style>
			<h3>${this._message}</h3>
			<textarea .value=${this._content} @input=${this._handleContentUpdated}></textarea>
			<div class='buttons'>
				<button class='round' @click='${this._handleDoneClicked}'>${CHECK_CIRCLE_OUTLINE_ICON}</button>
			</div>
		`;
	}

	constructor() {
		super();
		this.title = 'Compose';
	}

	_handleContentUpdated(e) {
		let ele = e.composedPath()[0];
		store.dispatch(composeUpdateContent(ele.value));
	}

	_handleDoneClicked() {
		store.dispatch(composeCommit());
	}

	_shouldClose() {
		//Override base class.
		store.dispatch(composeCancel());
	}

	static get properties() {
		return {
			_content: {type: String},
			_message: {type: String},
		};
	}

	stateChanged(state) {
		//tODO: it's weird that we manually set our superclasses' public property
		this.open = selectComposeOpen(state);
		this._content = selectPromptContent(state);
		this._message = selectPromptMessage(state);
	}

}

window.customElements.define('compose-dialog', ComposeDialog);
