export class OpenSidenav {
    static readonly type = '[layout] Open Sidenav';
}

export class CloseSidenav {
    static readonly type = '[layout] Close Sidenav';
}

export class SetToolbarTitle {
    static readonly type = '[layout] Set Toolbar Title';

    constructor(public title: string) {
    }
}