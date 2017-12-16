import {Injectable} from '@angular/core';
import {Actions} from '@ngrx/effects';
import {Observable} from 'rxjs/Observable';
import {Action} from '@ngrx/store';
import * as moveActions from '../actions/move.actions';

@Injectable()
export class MoveEffects {
    
    constructor(private actions: Actions) {
    }
    
    makeMove: Observable<Action> = this.actions
        .ofType<moveActions.MakeMove>(moveActions.MAKE_MOVE)
}