import { Component }       from '@angular/core';
import { Observable }      from 'rxjs';
import { Point }           from '../../models/point.model';
import * as moveActions    from '../../actions/move.actions';
import { Select, Store }   from "@ngxs/store";
import { CrissCrossState } from "../../state/criss-cross.state";

@Component({
    selector: 'cc-game-page', templateUrl: 'game-page.component.html'
})

export class GamePageComponent {
    @Select(CrissCrossState.getCrisses)crisses: Observable<Point[]>;
    @Select(CrissCrossState.getCrosses)crosses: Observable<Point[]>;

    constructor(private store: Store) {
    }

    click(move: Point) {
        this.store.dispatch(new moveActions.UserMove(move));
    }

}