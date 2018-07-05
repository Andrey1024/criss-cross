import { Component, Input, OnInit } from '@angular/core';
import { Store }                    from '@ngrx/store';
import * as fromRoot                from '../../../reducers';
import * as layoutActions           from '../../actions/layout.actions';

@Component({
    selector: 'cc-page', template: `
        <ng-content></ng-content>
    `
})

export class PageComponent implements OnInit {
    @Input() title: string;

    constructor(private store: Store<fromRoot.State>) {
    }

    ngOnInit() {
        this.store.dispatch(new layoutActions.SetToolbarTitle({ title: this.title }))
    }
}