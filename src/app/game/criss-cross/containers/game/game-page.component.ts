import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {getCrisses, getCrosses, State} from '../../reducers';
import {Observable} from 'rxjs/Observable';
import {Point} from '../../models/point.model';
import * as moveActions from '../../actions/move.actions';
import {Page} from "../../../../core/shared/page";

@Component({
    selector: 'cc-game-page',
    templateUrl: 'game-page.component.html'
})

export class GamePageComponent extends Page {
    crisses: Observable<Point[]>;
    crosses: Observable<Point[]>;
    
    constructor(store: Store<State>) {
        super(store, "Game");
        this.crisses = store.select(getCrisses);
        this.crosses = store.select(getCrosses);
    }
    
    click(move: Point) {
        this.store.dispatch(new moveActions.MakeMove({move}));
    }
    
}