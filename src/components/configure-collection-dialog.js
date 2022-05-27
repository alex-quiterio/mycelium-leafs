import { html, css } from 'lit';
import { connect } from 'pwa-helpers/connect-mixin.js';

// This element is connected to the Redux store.
import { store } from '../store.js';

import { DialogElement } from './dialog-element.js';

import {
	selectConfigureCollectionDialogOpen,
	selectActiveCollectionDescription,
	selectFilterDescriptions,
	selectAuthorAndCollaboratorUserIDs,
	selectTagInfosForCards
} from '../selectors.js';

import {
	closeConfigureCollectionDialog,
	navigateToCollection
} from '../actions/app.js';

import {
	collectionDescriptionWithSet,
	collectionDescriptionWithSort,
	collectionDescriptionWithSortReversed,
	collectionDescriptionWithFilterRemoved,
	collectionDescriptionWithFilterModified,
	collectionDescriptionWithFilterAppended
} from '../collection_description.js';

import {
	SET_INFOS,
	SORTS,
	ALL_FILTER_NAME,
} from '../filters.js';

import {
	PLUS_ICON
} from './my-icons.js';

import './configure-collection-filter.js';

class ConfigureCollectionDialog extends connect(store)(DialogElement) {

	static styles = [
		DialogElement.styles,
		css`
			.help {
				font-size:0.75em;
			}

			.row {
				display: flex;
				flex-direction: row;
				justify-content: space-between;
			}

			.row > div {
				display: flex;
				flex-direction: column;
			}
		`
	];

	innerRender() {
		return html`
			<label>Filters</label>
			<ul>
				${this._collectionDescription.filters.map((filterName, index) => html`<configure-collection-filter .value=${filterName} .index=${index} .filterDescriptions=${this._filterDescriptions} .cardTagInfos=${this._cardTagInfos} .userIDs=${this._userIDs} @filter-modified=${this._handleFilterModified} @filter-removed=${this._handleFilterRemoved}></configure-collection-filter>`)}
				<li><button class='small' @click=${this._handleAddFilterClicked} title='Add a new filter (ANDed with other filters)'>${PLUS_ICON}</button></li>
			</ul>
			<div class='row'>
				<div>
					<label>Set</label>
					<select @change=${this._handleSetSelectChanged} .value=${this._collectionDescription.set}>
						${Object.entries(SET_INFOS).map(entry => html`<option value=${entry[0]} title=${entry[1].description}>${entry[0]}</option>`)}
					</select>
				</div>
				<div>
					<label>Sort</label>
					<select @change=${this._handleSortSelectChanged} .value=${this._collectionDescription.sort}>
						${Object.entries(SORTS).map(entry => html`<option value=${entry[0]} title=${entry[1].description}>${entry[0]}</option>`)}
					</select>
				</div>
				<div>
					<label for='reversed'>Sort Reversed</label>
					<input type='checkbox' @change=${this._handleSortReversedCheckboxChanged} id='reversed' .checked=${this._collectionDescription.sortReversed}>
				</div>
			</div>
		`;
	}

	constructor() {
		super();
		this.title = 'Configure Collection';
	}

	_handleFilterModified(e) {
		store.dispatch(navigateToCollection(collectionDescriptionWithFilterModified(this._collectionDescription, e.detail.index, e.detail.value)));
	}

	_handleFilterRemoved(e) {
		store.dispatch(navigateToCollection(collectionDescriptionWithFilterRemoved(this._collectionDescription, e.detail.index)));
	}

	_handleAddFilterClicked() {
		store.dispatch(navigateToCollection(collectionDescriptionWithFilterAppended(this._collectionDescription, ALL_FILTER_NAME)));
	}

	_handleSetSelectChanged(e) {
		const ele = e.composedPath()[0];
		const set = ele.value;
		store.dispatch(navigateToCollection(collectionDescriptionWithSet(this._collectionDescription, set)));
	}

	_handleSortSelectChanged(e) {
		const ele = e.composedPath()[0];
		const sort = ele.value;
		store.dispatch(navigateToCollection(collectionDescriptionWithSort(this._collectionDescription, sort)));
	}

	_handleSortReversedCheckboxChanged(e) {
		const ele = e.composedPath()[0];
		const sortReversed = ele.checked;
		store.dispatch(navigateToCollection(collectionDescriptionWithSortReversed(this._collectionDescription, sortReversed)));
	}

	_handleDoneClicked() {
		store.dispatch(closeConfigureCollectionDialog());
	}

	_shouldClose() {
		//Override base class.
		store.dispatch(closeConfigureCollectionDialog());
	}

	static get properties() {
		return {
			_collectionDescription: {type: Object},
			_filterDescriptions: {type: Object},
			_userIDs: {type:Array},
			_cardTagInfos: {type:Object},
		};
	}

	stateChanged(state) {
		//tODO: it's weird that we manually set our superclasses' public property
		this.open = selectConfigureCollectionDialogOpen(state);
		this._collectionDescription = selectActiveCollectionDescription(state);
		this._filterDescriptions = selectFilterDescriptions(state);
		this._userIDs = selectAuthorAndCollaboratorUserIDs(state);
		this._cardTagInfos = selectTagInfosForCards(state);
	}

}

window.customElements.define('configure-collection-dialog', ConfigureCollectionDialog);
