import { Point }                                 from "../models/point.model";
import * as moves                                from "../actions/move.actions";
import { Action, Selector, State, StateContext } from "@ngxs/store";

export interface CrissCrossModel {
    moves: Point[];
}

const initialState: CrissCrossModel = {
    moves: []
};

@State<CrissCrossModel>({
    name: "game",
    defaults: initialState
})
export class CrissCrossState {
    @Selector() static getCrisses(state: CrissCrossModel) {
        return state.moves.filter((c, i) => i % 2);
    }

    @Selector() static getCrosses(state: CrissCrossModel) {
        return state.moves.filter((c, i) => !(i % 2));
    }

    @Action(moves.MakeMove)
    makeMove(ctx: StateContext<CrissCrossModel>, action: moves.MakeMove) {
        const state = ctx.getState();
        ctx.setState({ ...state, moves: state.moves.concat(action.move) })
    }
}