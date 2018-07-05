export const OPEN_SIDENAV = '[layout] Open Sidenav';
export const CLOSE_SIDENAV = '[layout] Close Sidenav';
export const SET_TOOLBAR_TITLE = '[layout] Set Toolbar Title';

export class OpenSidenav {
    static readonly type = OPEN_SIDENAV;
}

export class CloseSidenav {
    static readonly type = CLOSE_SIDENAV;
}

export class SetToolbarTitle {
    static readonly type = SET_TOOLBAR_TITLE;

    constructor(public payload: { title: string }) {
    }
}

export type Actions = OpenSidenav | CloseSidenav | SetToolbarTitle;