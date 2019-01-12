export const PROMPT_COMPOSE_SHOW = 'PROMPT_COMPOSE_SHOW';
export const PROMPT_COMPOSE_CANCEL = 'PROMPT_COMPOSE_CANCEL';
export const PROMPT_COMPOSE_COMMIT = 'PROMPT_COMPOSE_COMMIT';
export const PROMPT_COMPOSE_UPDATE_CONTENT = 'PROMPT_COMPOSE_UPDATE_CONTENT';

import {
  selectPromptAction,
  selectPromptContent,
} from '../selectors.js';

export const COMMIT_ACTIONS = {
  CONSOLE_LOG: 'CONSOLE_LOG',
}

export const composeShow = (message, starterContent, commitAction) => {
  return {
    type: PROMPT_COMPOSE_SHOW,
    message: message,
    content: starterContent,
    action: commitAction,
  }
}

export const composeCancel = () => {
  return {
    type: PROMPT_COMPOSE_CANCEL
  }
}

export const composeCommit = () => (dispatch, getState) => {

  const state = getState();

  dispatch({
    type: PROMPT_COMPOSE_COMMIT
  })

  doAction(selectPromptAction(state), selectPromptContent(state));

}

export const composeUpdateContent = (content) => {
  return {
    type: PROMPT_COMPOSE_UPDATE_CONTENT,
    content
  }
}


const doAction = (action, content) => {
  if (!action) return;
  switch (action) {
    case COMMIT_ACTIONS.CONSOLE_LOG:
      console.log(content);
      return;
  }
  console.warn("Unknown action: " + action);
}