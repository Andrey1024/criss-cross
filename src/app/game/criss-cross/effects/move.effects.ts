import {Injectable} from '@angular/core';
import {Actions, Effect} from '@ngrx/effects';
import {Observable} from 'rxjs/Observable';
import {Action} from '@ngrx/store';
import * as moveActions from '../actions/move.actions';
import {map, tap} from "rxjs/operators";
import {Message} from "@stomp/stompjs";
import {Move} from "../models/move.model";
import {WebSocketService} from "../../../services/web-socket.service";

@Injectable()
export class MoveEffects {
    
    constructor(private actions: Actions, private ws: WebSocketService) {
    }
    
    @Effect({dispatch: false})
    userMove: Observable<Action> = this.actions
        .ofType<moveActions.UserMove>(moveActions.USER_MOVE).pipe(
            tap((action: moveActions.UserMove) => this.ws.sendMessage("/app/game.makeMove", action.payload.move))
        );
    
    @Effect()
    makeMove: Observable<Action> = this.ws.getChannel("/channel/public").pipe(
        map((message: Message) => JSON.parse(message.body)),
        map((move: Move) => new moveActions.MakeMove({move: move.point}))
    )
}