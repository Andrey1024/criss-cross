import {createEntityAdapter, EntityState} from "@ngrx/entity";
import {User} from "../models/user.models";
import {Action} from "@ngrx/store";

export interface State extends EntityState<User> {
    onlineIds: string[]
}

const adapter = createEntityAdapter<User>();

const initialState: State = adapter.getInitialState({
    onlineIds: []
});

export function reducer(state = initialState, action: Action): State {
    switch (action.type) {
        
        default:
            return state;
    }
}

