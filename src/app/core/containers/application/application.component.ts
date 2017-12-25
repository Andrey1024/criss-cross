import {Component} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {Store} from '@ngrx/store';
import * as fromRoot from '../../../reducers';
import * as layoutActions from '../../actions/layout.actions';

@Component({
    selector: 'cc-application',
    templateUrl: 'application.component.html',
    styleUrls: ['application.component.scss'],
})

export class ApplicationComponent {
    showSidenav: Observable<boolean>;
    toolbarTitle: Observable<string>;
    
    constructor(private store: Store<fromRoot.State>) {
        this.showSidenav = store.select(fromRoot.getShowSidenav);
        this.toolbarTitle = store.select(fromRoot.getToolbarTitle);
    }
    
    openSidenav() {
        this.store.dispatch(new layoutActions.OpenSidenav());
    }
    
    closeSidenav() {
        this.store.dispatch(new layoutActions.CloseSidenav());
    }
}