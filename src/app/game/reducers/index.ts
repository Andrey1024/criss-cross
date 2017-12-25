import * as fromRoot from '../../reducers/index';
import * as fromGame from '../criss-cross/reducers/game.reducer';
import {createFeatureSelector, createSelector} from "@ngrx/store";

export interface GameState {
    game: fromGame.State;
}

export interface State extends fromRoot.State {
    game: GameState;
}

export const reducers = {
    game: fromGame.reducer
};

const getGameState = createFeatureSelector<GameState>('game');

const selectGame = createSelector(getGameState, state => state.game);

export const getMoves = createSelector(selectGame, fromGame.getMoves);
export const getCrisses = createSelector(getMoves, moves => moves.filter((c, i) => i % 2));
export const getCrosses = createSelector(getMoves, moves => moves.filter((c, i) => !(i % 2)));