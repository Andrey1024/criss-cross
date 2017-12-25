import {Action} from "@ngrx/store";
import {Point} from "../models/point.model";

export const MAKE_MOVE = '[move] Make Move';
export const USER_MOVE = '[move] User Move';


export class MakeMove implements Action {
    readonly type = MAKE_MOVE;
    
    constructor(public payload: { move: Point }) {
    }
}

export class UserMove implements Action {
    readonly type = USER_MOVE;
    
    constructor(public payload: { move: Point }) {
    }
}

export type Actions
    = MakeMove
    | UserMove;