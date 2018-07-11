import * as auth                   from '../actions/auth.actions';
import { Action, Selector, State } from "@ngxs/store";

export interface LoginFormModel {
    login: string;
    password: string;
}

const initialState: LoginFormModel = {
    login: "",
    password: ""
};

@State<LoginFormModel>({
    name: "loginForm",
    defaults: initialState
})
export class LoginFormState {
    @Selector() static getAuthorities(state: LoginFormModel) {
        return state;
    }
}