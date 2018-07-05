import * as auth from '../actions/auth.actions';
import { User }  from '../models/user.models';
import { State } from "@ngxs/store";

export interface AuthModel {
    loggedIn: boolean;
    user: User | null;
}

export const initialState: AuthModel = {
    loggedIn: false, user: null,
};

@State<AuthModel>({
    name: "auth"
})
export class AuthState {

}

export const getLoggedIn = (state: AuthModel) => state.loggedIn;
export const getUser = (state: AuthModel) => state.user;