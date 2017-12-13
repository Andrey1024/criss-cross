import {Action} from "@ngrx/store";

export const OPEN_SIDENAV = '[layout] Open Sidenav';
export const CLOSE_SIDENAV = '[layout] Close Sidenav';
export const SET_TOOLBAR_TITLE = '[layout] Set Toolbar Title';

export class OpenSidenav implements Action {
    readonly type = OPEN_SIDENAV;
}

export class CloseSidenav implements Action {
    readonly type = CLOSE_SIDENAV;
}

export class SetToolbarTitle implements Action {
    readonly type = SET_TOOLBAR_TITLE;
    
    constructor(public payload: { title: string }) {
    }
}

export type Actions
    = OpenSidenav
    | CloseSidenav
    | SetToolbarTitle;