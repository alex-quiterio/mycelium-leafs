export const UPDATE_CARDS = 'UPDATE_CARDS';
export const UPDATE_SECTIONS = 'UPDATE_SECTIONS';
export const SHOW_CARD = 'SHOW_CARD';
export const SHOW_SECTION = 'SHOW_SECTION';

const CARDS_COLLECTION = 'cards';
const SECTIONS_COLLECTION = 'sections';

const db = firebase.firestore();

db.settings({
  timestampsInSnapshots:true,
})

export const connectLiveCards = (store) => {
  db.collection(CARDS_COLLECTION).onSnapshot(snapshot => {

    let cards = {};

    snapshot.docChanges().forEach(change => {
      if (change.type === 'removed') return;
      let doc = change.doc;
      let id = doc.id;
      let card = doc.data();
      card.id = id;
      cards[id] = card;
    })

    store.dispatch(updateCards(cards));

  });
}

export const connectLiveSections = (store) => {
  db.collection(SECTIONS_COLLECTION).orderBy('order').onSnapshot(snapshot => {

    let sections = {};

    snapshot.docChanges().forEach(change => {
      if (change.type === 'removed') return;
      let doc = change.doc;
      let id = doc.id;
      let section = doc.data();
      section.id = id;
      sections[id] = section;
    })

    store.dispatch(updateSections(sections));

  })
}

const randomCharSet = "abcdef0123456789"

const randomString = (length) => {
  let text = "";
  for (let i = 0; i < length; i++) {
    text += randomCharSet.charAt(Math.floor(Math.random() * randomCharSet.length));
  }
  return text;
}

export const newCard = (section, id) => {

  //newCard creates and inserts a new card in the givne section with the given id.

  if (!section) section = 'stubs';
  if (!id) id = randomString(6);

  let obj = {
    created: new Date(),
    updated: new Date(),
    updated_substantive: new Date(),
    title: "",
    body: "",
    links: [],
    links_inbound: [],
    notes: "",
    slugs: [],
    name: id,
    tags: []
  }

  let cardDocRef = db.collection(CARDS_COLLECTION).doc(id);

  let sectionRef = db.collection(SECTIONS_COLLECTION).doc(starterCard.section);

  //TODO: do a transaction here.
  //Check ot make sure that cardDoc id does not currently exist.
  //Then put the starter card, and add its id to the end of the section's cards list.
}


export const updateSections = (sections) => {
  return {
    type: UPDATE_SECTIONS,
    sections,
  }
}

export const updateCards = (cards) => {
  return {
    type:UPDATE_CARDS,
    cards,
  }
}

export const showCard = (cardId) => {
  return {
    type: SHOW_CARD,
    card: cardId
  }
}

export const showSection = (sectionId) => {
  return {
    type: SHOW_SECTION,
    section: sectionId
  }
}

export const showNewCard = () => (dispatch, getState) => {

  const cards = getState().data.cards;

  let keys = Object.keys(cards);

  dispatch(showCard(keys[0]))
}

