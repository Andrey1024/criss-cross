import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable }                         from 'rxjs';
import * as layoutActions                     from '../../actions/layout.actions';
import { Select, Store }                      from "@ngxs/store";
import { LayoutState }                        from "../../state/layout.state";

@Component({
    selector: 'cc-application',
    templateUrl: 'application.component.html',
    styleUrls: ['application.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})

export class ApplicationComponent {
    @Select(LayoutState.isSidenavVisible) showSidenav: Observable<boolean>;
    @Select(LayoutState.getToolbarTitle) toolbarTitle: Observable<string>;

    constructor(private store: Store) {
    }

    openSidenav() {
        this.store.dispatch(new layoutActions.OpenSidenav());
    }

    closeSidenav() {
        this.store.dispatch(new layoutActions.CloseSidenav());
    }
}