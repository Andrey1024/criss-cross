import {Action} from '@ngrx/store';
import {Player} from '../models/player.model';

export const SURRENDER = '[game] Surrender';
export const NEW_GAME = '[game] New Game';

export class Surrender implements Action {
    readonly type = SURRENDER;
}

export class NewGame implements Action {
    readonly type = NEW_GAME;
    
    constructor(public payload: {}) {
    }
}

export type Actions
    = Surrender
    | NewGame;