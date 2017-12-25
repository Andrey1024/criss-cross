import {Component} from '@angular/core';
import {Store} from '@ngrx/store';
import * as fromGame from '../../../reducers';
import {Observable} from 'rxjs/Observable';
import {Point} from '../../models/point.model';
import * as moveActions from '../../actions/move.actions';

@Component({
    selector: 'cc-game-page',
    templateUrl: 'game-page.component.html'
})

export class GamePageComponent {
    crisses: Observable<Point[]>;
    crosses: Observable<Point[]>;
    
    constructor(private store: Store<fromGame.State>) {
        this.crisses = store.select(fromGame.getCrisses);
        this.crosses = store.select(fromGame.getCrosses);
    }
    
    click(move: Point) {
        this.store.dispatch(new moveActions.UserMove({move}));
    }
    
}