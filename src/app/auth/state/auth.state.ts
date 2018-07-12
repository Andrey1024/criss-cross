import * as auth from '../actions/auth.actions';
import { Action, Selector, State, StateContext, Store } from "@ngxs/store";
import { HttpClient } from "@angular/common/http";
import { User } from "../models/user.models";
import { LoginFormState } from "./login-form.state";

export interface AuthModel {
    loggedIn: boolean;
    user: User | null;
}

export const initialState: AuthModel = {
    loggedIn: false,
    user: null,
};

@State<AuthModel>({
    name: "auth",
    defaults: initialState
})
export class AuthState {

    constructor(private http: HttpClient, private store: Store) {
    }

    @Selector()
    static isLoggedIn(state: AuthModel) {
        return state.loggedIn;
    }

    @Selector()
    static getLoggedInUser(state: AuthModel) {
        return state.user ? state.user : null;
    }

    @Action(auth.Login)
    login(ctx: StateContext<AuthModel>) {
        const authorities = this.store.selectSnapshot<{ login: string; password: string }>(LoginFormState.getAuthorities);
        this.http.post<User>("api/login", { username: authorities.login, password: authorities.password })
            .subscribe(user => {
                const state = ctx.getState();
                ctx.setState({
                    ...state, loggedIn: true, user
                })
            });
    }
}
