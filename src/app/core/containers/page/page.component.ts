import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import * as layoutActions                                    from '../../actions/layout.actions';
import { Store }                                             from "@ngxs/store";

@Component({
    selector: 'cc-page',
    template: `
        <ng-content></ng-content>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})

export class PageComponent implements OnInit {
    @Input() title: string;

    constructor(private store: Store) {
    }

    ngOnInit() {
        this.store.dispatch(new layoutActions.SetToolbarTitle(this.title));
    }
}