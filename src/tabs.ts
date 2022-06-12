import {
	RECENT_SORT_NAME,
	STARS_SORT_NAME,
	READING_LIST_SET_NAME,
	EVERYTHING_SET_NAME,
} from './filters.js';

import {
	CollectionDescription
} from './collection_description.js';

import * as icons from './components/my-icons.js';

import {
	CARD_TYPE_WORKING_NOTES,
	CARD_TYPE_CONCEPT
} from './type_constants.js';

import {
	TWITTER_HANDLE
} from './config.GENERATED.SECRET.js';

import {
	TabConfigItem,
	TabConfig,
	ExpandedTabConfig,
	ExpandedTabConfigItem,
	Sections
} from './types.js';

export const READING_LIST_FALLBACK_CARD = 'about-reading-lists';
export const STARS_FALLBACK_CARD = 'about-stars';

export const tabConfiguration = (config : TabConfig, sections : Sections, tags : Sections) : ExpandedTabConfig => {
	if (!config) config = DEFAULT_CONFIG;
	let array = config;
	let lastArray = [];
	let changesMade = false;
	let count = 0;
	do {
		changesMade = false;
		lastArray = array;
		array = [];
		for (let item of lastArray) {
			const [expandedItems, didExpand] = expandTabConfigItem(item, sections, tags);
			if (didExpand) changesMade = true;
			array = array.concat(...expandedItems);
		}
		count++;
	} while(changesMade && count < 100);
	return inflateCollectionsAndIcons(array);
};

const inflateCollectionsAndIcons = (config : TabConfig) : ExpandedTabConfig => {
	let result = [];
	for (let item of config) {
		let itemToAdd : ExpandedTabConfigItem = {
			...item,
			expandedCollection:  (item.collection instanceof CollectionDescription) ? item.collection : (item.collection ? CollectionDescription.deserialize(item.collection as string) : null),
			expandedIcon: (typeof item.icon != 'string') ? item.icon : icons[item.icon]
		};
		if (item.icon && !itemToAdd.expandedIcon) console.warn('Invalid icon name: ' + item.icon);
		result.push(itemToAdd);
	}
	return result;
};

const DEFAULT_CONFIG : TabConfig = [
	{
		expand: 'default_tabs'
	}
];

const EXPANSION_ITEMS : {[name : string]: TabConfig} = {
	'default_tabs': [
		{
			expand: 'sections',
		},
		{
			expand: 'hidden_tags',
		},
		{
			expand: 'default_end_tabs',
		}
	],
	'default_end_tabs': [
		{
			expand: 'popular'
		},
		{
			expand: 'recent'
		},
		{
			expand: 'reading-list'
		},
		{
			expand: 'starred'
		},
		{
			expand: 'unread'
		},
		{
			expand: 'working-notes',
		},
		{
			expand: 'concepts',
		},
		{
			expand: 'twitter',
		}
	],
	'popular': [
		{
			icon: icons.INSIGHTS_ICON,
			display_name: 'Popular',
			//TODO: this should be DEFAULT_SET_NAME, but if you click on the tab with DEFAULT_SET_NAME and a sort and no filters, it breaks
			collection: new CollectionDescription(EVERYTHING_SET_NAME,[], STARS_SORT_NAME, false),
			//If any section has default set to true first, it will be default. This is thus a fallback.
			default:true,
		}
	],
	'recent': [
		{
			icon: icons.SCHEDULE_ICON,
			display_name: 'Recent',
			collection: new CollectionDescription(EVERYTHING_SET_NAME, ['has-content'], RECENT_SORT_NAME, false),
		}
	],
	'reading-list': [
		{
			icon: icons.PLAYLIST_PLAY_ICON,
			display_name: 'Your reading list',
			collection: new CollectionDescription(READING_LIST_SET_NAME),
			count: true,
			fallback_cards: [READING_LIST_FALLBACK_CARD],
		}
	],
	'starred': [
		{
			icon: icons.STAR_ICON,
			display_name: 'Your starred cards',
			collection: new CollectionDescription(EVERYTHING_SET_NAME, ['starred']),
			count: true,
			fallback_cards: [STARS_FALLBACK_CARD],
		}
	],
	'unread': [
		{
			icon: icons.VISIBILITY_ICON,
			display_name: 'Cards you haven\'t read yet',
			collection: new CollectionDescription('', ['unread']),
			count: true,
		}
	],
	'working-notes': [
		{
			icon: icons.INSERT_DRIVE_FILE_ICON,
			display_name: 'Working note cards',
			collection: new CollectionDescription(EVERYTHING_SET_NAME, [CARD_TYPE_WORKING_NOTES], RECENT_SORT_NAME, false),
			count:true,
			hideIfEmpty: true,
		}
	],
	'concepts': [
		{
			icon: icons.MENU_BOOK_ICON,
			display_name: 'Concept cards',
			collection: new CollectionDescription(EVERYTHING_SET_NAME, [CARD_TYPE_CONCEPT]),
			count:true,
			hideIfEmpty: true,
		}
	],
	'twitter': [
		{
			icon: icons.TWITTER_ICON,
			display_name: '@' + TWITTER_HANDLE + ' tweets multiple times a day with cards from this collection. It\'s a great way to dip your toe in the content.',
			href: 'https://twitter.com/' + TWITTER_HANDLE,
			//Don't show the item if no twitter handle
			hide: !TWITTER_HANDLE,
		}
	]
};

const DEFAULT_LOADING_TAB : TabConfigItem = {
	collection: new CollectionDescription(),
	display_name: 'Loading...',
	italics: true,
};


const tabsForSections = (sections : Sections, doHide? : boolean) : TabConfig => {
	//Only doSelectDefaultIfNonProvided for sections
	if (!doHide) doHide = false;
	if (!sections || Object.keys(sections).length == 0) {
		return [{...DEFAULT_LOADING_TAB, hide:doHide}];
	}

	const result = Object.values(sections).map(section => ({
		display_name: section.title,
		collection: new CollectionDescription('', [section.id]),
		start_cards: section.start_cards,
		hide: doHide,
		default: section.default,
	}));

	return result;
};

const expandTabConfigItem = (configItem : TabConfigItem, sections : Sections, tags : Sections) : [expandedConfig: TabConfig, changesMade : boolean] => {
	if (!configItem) return [[configItem], false];

	if (!configItem.expand) return [[configItem], false];

	const configItemWithoutExpand = Object.fromEntries(Object.entries(configItem).filter(entry => entry[0] != 'expand'));

	//We expand the first item (without the expand keyword) first, then the
	//expansion item (once each for each item in the expansion). That means you
	//can set non-default properties, e.g. {expand:'concept', default:true} and
	//have the default:true still exist after expansion.
	if (EXPANSION_ITEMS[configItem.expand]) return [[...EXPANSION_ITEMS[configItem.expand].map(item => ({...configItemWithoutExpand, ...item}))], true];

	if (configItem.expand == 'sections') {
		return [tabsForSections(sections, false), true];
	}
	if (configItem.expand == 'hidden_sections') {
		return [tabsForSections(sections, true), true];
	}
	if (configItem.expand == 'tags') {
		return [tabsForSections(tags), true];
	}
	if (configItem.expand == 'hidden_tags') {
		return [tabsForSections(tags, true), true];
	}

	console.warn('Unknown tabs expansion: ' + configItem.expand);
	return [[], false];
};