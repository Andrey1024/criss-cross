import * as layoutActions from "../actions/layout.actions";

export interface State {
    showSidenav: boolean;
    toolbarTitle: string;
}

export const initialState: State = {
    showSidenav: false,
    toolbarTitle: ""
};

export function reducer(state: State = initialState, action: layoutActions.Actions): State {
    switch (action.type) {
        case layoutActions.OPEN_SIDENAV:
            return {...state, showSidenav: true};
        case layoutActions.CLOSE_SIDENAV:
            return {...state, showSidenav: false};
        case layoutActions.SET_TOOLBAR_TITLE:
            return {...state, toolbarTitle: action.payload.title};
        default:
            return state;
    }
}

export const getShowSidenav = (state: State) => state.showSidenav;
export const getToolbarTitle = (state: State) => state.toolbarTitle;