import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {Store} from '@ngrx/store';
import * as fromRoot from '../../../reducers';

@Component({
    selector: 'cc-application',
    templateUrl: 'application.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})

export class ApplicationComponent implements OnInit {
    showSidenav: Observable<boolean>;
    
    constructor(private store: Store<fromRoot.State>) {
        this.showSidenav = store.select(fromRoot.getShowSidenav);
    }
    
    ngOnInit() {
    }
}