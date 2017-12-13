import * as fromRoot from '../../reducers';
import * as fromGame from './game.reducer';
import {createFeatureSelector, createSelector} from "@ngrx/store";

export interface State extends fromRoot.State {
    game: fromGame.State;
}

const getGameState = createFeatureSelector<fromGame.State>('game');

export const getMoves = createSelector(getGameState, fromGame.getMoves);
export const getCrisses = createSelector(getMoves, moves => moves.filter((c, i) => i % 2));
export const getCrosses = createSelector(getMoves, moves => moves.filter((c, i) => !(i % 2)));