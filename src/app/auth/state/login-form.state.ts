import * as auth from '../actions/auth.actions';
import { Action, Selector, State } from "@ngxs/store";

export interface LoginFormModel {
    model: {
        login: string;
        password: string;
    };
    dirty: boolean;
    status: string;
    errors: any;
}

const initialState: LoginFormModel = {
    model: {
        login: "",
        password: ""
    },
    dirty: false,
    status: "",
    errors: {}
};

@State<LoginFormModel>({
    name: "loginForm",
    defaults: initialState
})
export class LoginFormState {
    @Selector()
    static getAuthorities(state: LoginFormModel) {
        return state.model;
    }
}