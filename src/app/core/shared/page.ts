import {OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import * as fromRoot from '../../reducers';
import * as layoutActions from '../actions/layout.actions';

export class Page implements OnInit {
    constructor(protected store: Store<fromRoot.State>, private title: string) {
    }
    
    ngOnInit() {
        this.store.dispatch(new layoutActions.SetToolbarTitle({title: this.title}));
    }
}