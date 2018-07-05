import { Point }                       from "../models/point.model";
import * as moves                      from "../actions/move.actions";
import { Action, State, StateContext } from "@ngxs/store";

export interface GameModel {
    moves: Point[];
}

const initialState: GameModel = {
    moves: []
};

@State<GameModel>({
    name: "game",
    defaults: initialState
})
export class GameState {
    @Action(moves.MakeMove)
    makeMove(ctx: StateContext<GameModel>, action: moves.MakeMove) {
        const state = ctx.getState();
        ctx.setState({ ...state, moves: state.moves.concat(action.move) })
    }
}

export const getMoves = (state: GameModel) => state.moves;