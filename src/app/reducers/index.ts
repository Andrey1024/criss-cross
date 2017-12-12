import * as fromLayout from '../core/reducers/layout.reducer'
import {createFeatureSelector, createSelector} from "@ngrx/store";

export interface State {
    layout: fromLayout.State
    
}

export const reducers = {
    layout: fromLayout.reducer
}

const getLayoutState = createFeatureSelector<fromLayout.State>('layout');

export const getShowSidenav = createSelector(
    getLayoutState,
    fromLayout.getShowSidenav
);