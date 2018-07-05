import * as fromRoot                             from '../../reducers/index';
import * as fromGame                             from '../criss-cross/state/game.state';
import { createFeatureSelector, createSelector } from "@ngrx/store";

export interface GameState {
    game: fromGame.GameModel;
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