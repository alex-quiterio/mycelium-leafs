import { 
	SIGNIN_USER,
	SIGNIN_SUCCESS,
	SIGNIN_FAILURE,
	SIGNOUT_USER,
	SIGNOUT_SUCCESS,
	UPDATE_STARS,
	UPDATE_READS,
	AUTO_MARK_READ_PENDING_CHANGED,
	UPDATE_READING_LIST,
	UPDATE_USER_PERMISSIONS
} from '../actions/user.js';

import {
	setRemove,
	setUnion
} from '../util.js';

import {
	UPDATE_COLLECTION_SHAPSHOT 
} from '../actions/collection.js';

import {
	CardID,
	FilterMap,
	UserInfo,
	UserPermissions
} from '../types.js';

type UserState = {
	user : UserInfo,
	//pending is true whenever we are expecting either a SIGNIN_SUCCESS or
	//SIGNOUT_SUCCESS. That's true both when the page loads before we get the
	//initial auth state (which is why it defaults to true), and also when the
	//user has proactively hit the signIn or signOut buttons.
	pending: boolean,
	error: Error,
	//userPermissions is the object that tells us what we're allowed to do. The
	//security rules will actually enforce this; this is mainly just to not have
	//affordances in the client UI if they won't work. See BASE_PERMISSIONS
	//documentation for what the legal values are.
	userPermissions: UserPermissions,
	stars : FilterMap,
	reads: FilterMap,
	readingList: CardID[],
	//This is the reading list that we use for the purposes of the live set. We
	//only update it when UPDATE_COLLECTION_SHAPSHOT is called, for
	//similar reasons that we use filters/pendingFiltesr for sets. That is,
	//reading-list is liable to change while the user is viewing that set, due
	//to their own actions, and it would be weird if the cards would disappear
	//when they hit that button.
	readingListSnapshot: CardID[],
	//These two are analoges to cardsLoaded et al in data. They're set to true
	//after UPDATE_STARS or _READS has been called at least once.  Primarily for
	//selectDataIsFullyLoaded purposes.
	starsLoaded: boolean,
	readsLoaded: boolean,
	readingListLoaded: boolean,
	userPermissionsLoaded: boolean,
	autoMarkReadPending: boolean,
}

const INITIAL_STATE : UserState = {
	user : null,
	pending: true,
	error: null,
	userPermissions: {},
	stars : {},
	reads: {},
	readingList: [],
	readingListSnapshot: [],
	starsLoaded: false,
	readsLoaded: false,
	readingListLoaded: false,
	userPermissionsLoaded: false,
	autoMarkReadPending: false,
};

const app = (state : UserState = INITIAL_STATE, action) : UserState => {
	switch (action.type) {
	case SIGNIN_USER:
		return {
			...state,
			pending: true
		};
	case SIGNIN_SUCCESS:
		return {
			...state,
			pending:false,
			user: action.user,
			stars: {},
			reads: {}
		};
	case SIGNIN_FAILURE:
		return {
			...state,
			pending:false,
			error: action.error
		};
	case SIGNOUT_USER:
		return {
			...state,
			pending:true
		};
	case SIGNOUT_SUCCESS:
		return {
			...state,
			pending:false,
			user: null,
			stars: {},
			reads: {}
		};
	case UPDATE_STARS:
		return {
			...state,
			stars: setUnion(setRemove(state.stars, action.starsToRemove), action.starsToAdd),
			starsLoaded: true,
		};
	case UPDATE_READS:
		return {
			...state,
			reads: setUnion(setRemove(state.reads, action.readsToRemove), action.readsToAdd),
			readsLoaded: true,
		};
	case UPDATE_READING_LIST:
		return {
			...state,
			readingList: [...action.list],
			readingListLoaded: true,
		};
	case UPDATE_USER_PERMISSIONS:
		return {
			...state,
			userPermissions: {...action.permissions},
			userPermissionsLoaded: true,
		};
	case UPDATE_COLLECTION_SHAPSHOT:
		return {
			...state,
			readingListSnapshot: [...state.readingList]
		};
	case AUTO_MARK_READ_PENDING_CHANGED:
		return {
			...state,
			autoMarkReadPending: action.pending
		};
	default:
		return state;
	}
};

export default app;