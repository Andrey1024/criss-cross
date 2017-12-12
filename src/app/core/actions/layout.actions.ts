import {Action} from "@ngrx/store";

export const OPEN_SIDENAV = '[layout] Open Sidenav';
export const CLOSE_SIDENAV = '[layout] Close Sidenav';

export class OpenSidenav implements Action {
    readonly type = OPEN_SIDENAV;
}

export class CloseSidenav implements Action {
    readonly type = CLOSE_SIDENAV;
}

export type Actions
    = OpenSidenav
    | CloseSidenav