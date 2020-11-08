import { html } from '@polymer/lit-element';
import { connect } from 'pwa-helpers/connect-mixin.js';

// This element is connected to the Redux store.
import { store } from '../store.js';

import { DialogElement } from './dialog-element.js';

import find from '../reducers/find.js';
store.addReducers({
	find
});

import {
	closeFindDialog,
	updateQuery,
	findUpdateCardTypeFilter
} from '../actions/find.js';

import {
	navigateToCard
} from '../actions/app.js';

import {
	linkCard,
	linkURL,
	savedSelectionRangeIsLink,
	setCardToReference,
} from '../actions/editor.js';

import {
	createCard
} from '../actions/data.js';

import {
	setCardToAddPermissionTo
} from '../actions/permissions.js';

import {
	selectExpandedRankedCollectionForQuery,
	selectPartialMatchedItemsForQuery,
	selectUserMayCreateCard,
	selectBodyCardTypes,
	selectFindCardTypeFilter,
	selectFindReferencing,
	selectEditingPendingReferenceType
} from '../selectors.js';

import { 
	PLUS_ICON,
	LINK_ICON,
	LINK_OFF_ICON
} from './my-icons.js';

import {
	REFERENCE_TYPES
} from '../card_fields.js';

import { ButtonSharedStyles } from './button-shared-styles.js';

import './card-drawer.js';

import { 
	newID, 
	capitalizeFirstLetter
} from '../util.js';

class FindDialog extends connect(store)(DialogElement) {
	innerRender() {

		const isLink = savedSelectionRangeIsLink();

		return html`
		${ButtonSharedStyles}
		<style>
			card-drawer {
				font-size:14px;
			}

			#query {
			  border: 0 solid black;
			  font-size:0.8em;
			  border-bottom:1px solid var(--app-dark-text-color);
			  width: 100%;
			}

			.add {
				text-align:right;
				position:absolute;
				bottom: 0.5em;
				right: 0.5em;
			}
		</style>
		<form @submit=${this._handleFormSubmitted}>
			${this._bodyCardTypes.length > 1 ? html`<div><span>Card type:</span>
				${['', ...this._bodyCardTypes].map(typ => html`<input type='radio' name='card-type' @change=${this._handleCardTypeChanged} .checked=${this._cardTypeFilter === typ} value='${typ}' id='card-type-${typ}'><label for='card-type-${typ}'>${typ || html`<em>Default</em>`}</label>`)}
			</div>` : ''}
			<input placeholder='Text to search for' id='query' type='search' @input=${this._handleQueryChanged} .value=${this._query}></input>
		</form>
		<card-drawer showing grid @thumbnail-tapped=${this._handleThumbnailTapped} .collection=${this._collection} .collectionItemsToGhost=${this._partialMatches}></card-drawer>
		<div ?hidden=${!this._linking} class='add'>
			<button ?hidden=${!isLink} class='round' @click='${this._handleRemoveLink}' title='Remove the current link'>${LINK_OFF_ICON}</button>
			<button class='round' @click='${this._handleAddLink}' title='Link to a URL, not a card'>${LINK_ICON}</button>
			<button class='round' @click='${this._handleAddSlide}' title='Create a new stub card to link to' ?hidden=${!this._userMayCreateCard}>${PLUS_ICON}</button>
		</div>
	`;
	}

	constructor() {
		super();
		this.title = this._computedTitle;
		this._bodyCardTypes = [];
	}

	_shouldClose() {
		//Override base class.
		store.dispatch(closeFindDialog());
	}

	_handleFormSubmitted(e) {
		e.preventDefault();
		if(!this._linking) return;
		if(this._collection && this._collection.length > 0) return;
		if(!this._query) return;
		if(!this._query.startsWith('http')) return;
		store.dispatch(linkURL(this._query));
		this._shouldClose();
	}

	_handleQueryChanged(e) {
		let ele = e.composedPath()[0];
		store.dispatch(updateQuery(ele.value));
	}

	_handleCardTypeChanged(e) {
		const filter = e.target.value;
		store.dispatch(findUpdateCardTypeFilter(filter));
	}

	_handleAddLink() {
		let href = prompt('Where should the URL point?', this._query);
		store.dispatch(linkURL(href));
		this._shouldClose();
	}

	_handleRemoveLink(){
		store.dispatch(linkURL(''));
		this._shouldClose();
	}

	_handleAddSlide() {
		const query = this._query || '';
		const title = prompt('What should the title be?', capitalizeFirstLetter(query.trim()));
		if (!title || !title.trim()) {
			console.warn('No title provided');
			return;
		}
		const id = newID();
		const opts = {
			id,
			title,
			noNavigate: true,
		};
		store.dispatch(createCard(opts));
		store.dispatch(linkCard(id));
		this._shouldClose();
	}

	_handleThumbnailTapped(e) {
		this._shouldClose();
		if (this._linking) {
			store.dispatch(linkCard(e.detail.card.id));
			return;
		}
		if (this._permissions) {
			store.dispatch(setCardToAddPermissionTo(e.detail.card.id));
			return;
		}
		if (this._referencing) {
			store.dispatch(setCardToReference(e.detail.card.id));
			return;
		}
		store.dispatch(navigateToCard(e.detail.card));
	}

	static get properties() {
		return {
			_query: {type: String},
			_collection: {type:Array},
			_linking: {type:Boolean},
			_permissions: {type:Boolean},
			_referencing: {type:Boolean},
			_pendingReferenceType: {type:String},
			_partialMatches: {type:Object},
			_userMayCreateCard: {type:Boolean},
			_bodyCardTypes: {type:Array},
			_cardTypeFilter: {type:String},
		};
	}

	get _computedTitle() {
		if (this._linking) {
			return 'Find card to link';
		}
		if (this._permissions) {
			return 'Find card to add permissions to';
		}
		if (this._referencing) {
			return this._pendingReferenceType ? 'Find card to reference as ' + REFERENCE_TYPES[this._pendingReferenceType].name : 'Find card to reference';
		}
		return 'Search';
	}

	updated(changedProps) {
		if (changedProps.has('open') && this.open) {
			//When first opened, select the text in query, so if the starter
			//query is wrong as you long keep typing it will be no cost
			this.shadowRoot.getElementById('query').select();
		}
		if (changedProps.has('_linking') || changedProps.has('_referencing') || changedProps.has('_permissions')) {
			this.title = this._computedTitle;
		}
	}

	stateChanged(state) {
		//tODO: it's weird that we manually set our superclasses' public property
		this.open = state.find.open;
		this.mobileMode = state.app.mobileMode;

		this._query = state.find.query;
		this._collection = selectExpandedRankedCollectionForQuery(state);
		this._partialMatches = selectPartialMatchedItemsForQuery(state);
		this._linking = state.find.linking;
		this._permissions = state.find.permissions;
		this._referencing = selectFindReferencing(state);
		this._pendingReferenceType = selectEditingPendingReferenceType(state);
		this._userMayCreateCard = selectUserMayCreateCard(state);
		this._bodyCardTypes = selectBodyCardTypes(state);
		this._cardTypeFilter = selectFindCardTypeFilter(state);
	}

}

window.customElements.define('find-dialog', FindDialog);
