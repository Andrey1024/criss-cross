import * as layoutActions from "../actions/layout.actions";

export interface State {
    showSidenav: boolean;
}

export const initialState: State = {
    showSidenav: false
};

export function reducer(state: State = initialState, action: layoutActions.Actions): State {
    switch (action.type) {
        case layoutActions.OPEN_SIDENAV:
            return {...state, showSidenav: true};
        case layoutActions.CLOSE_SIDENAV:
            return {...state, showSidenav: false};
        default:
            return state;
    }
}

export const getShowSidenav = (state: State) => state.showSidenav;