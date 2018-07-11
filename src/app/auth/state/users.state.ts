import { User }  from "../models/user.models";
import { State } from "@ngxs/store";

export interface UsersModel {
    [id: number]: User;
}

const initialState: UsersModel = {};

@State<UsersModel>({
    name: "users",
    defaults: initialState
})
export class UsersState {
}