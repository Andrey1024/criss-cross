import {Component, OnInit} from '@angular/core';
import {Store} from "@ngrx/store";
import {getCrisses, getCrosses, State} from "../../reducers";
import {Observable} from "rxjs/Observable";
import {Point} from "../../shared/point.model";

@Component({
    selector: 'cc-game-page',
    templateUrl: 'game-page.component.html'
})

export class GamePageComponent implements OnInit {
    crisses: Observable<Point[]>;
    crosses: Observable<Point[]>;
    
    constructor(private store: Store<State>) {
        // this.crisses = store.select(getCrisses);
        // this.crosses = store.select(getCrosses);
    }
    
    ngOnInit() {
    }
}