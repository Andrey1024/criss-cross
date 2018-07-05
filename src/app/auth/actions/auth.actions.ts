import { User }         from '../models/user.models';
import { Authenticate } from '../models/authenticate.model';

export const LOGIN = '[Auth] Login';
export const LOGOUT = '[Auth] Logout';
export const LOGIN_SUCCESS = '[Auth] Login Success';
export const LOGIN_FAILURE = '[Auth] Login Failure';
export const LOGIN_REDIRECT = '[Auth] Login Redirect';

export class Login {
    static readonly type = LOGIN;

    constructor(public payload: Authenticate) {
    }
}

export class LoginSuccess {
    static readonly type = LOGIN_SUCCESS;

    constructor(public payload: { user: User }) {
    }
}

export class LoginFailure {
    static readonly type = LOGIN_FAILURE;

    constructor(public payload: any) {
    }
}

export class LoginRedirect {
    static readonly type = LOGIN_REDIRECT;
}

export class Logout {
    static readonly type = LOGOUT;
}

export type Actions = | Login | LoginSuccess | LoginFailure | LoginRedirect | Logout;