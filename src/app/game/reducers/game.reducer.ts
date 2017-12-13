import {Point} from "../shared/point.model";
import * as moves from "../actions/move.actions";

export interface State {
    moves: Point[] | null;
}

const initialState: State = {
    moves: []
};

export function reducer(state: State = initialState, action: moves.Actions): State {
    switch (action.type) {
        case moves.MAKE_MOVE:
            return {...state, moves: state.moves.concat(action.payload.move)};
        default:
            return state;
    }
}

export const getMoves = (state: State) => state.moves;