import * as layoutActions                        from "../actions/layout.actions";
import { Action, Selector, State, StateContext } from "@ngxs/store";

export interface LayoutModel {
    showSidenav: boolean;
    toolbarTitle: string;
}

const initialState: LayoutModel = {
    showSidenav: false,
    toolbarTitle: ""
};

@State<LayoutModel>({
    name: "layout",
    defaults: initialState
})
export class LayoutState {
    @Action(layoutActions.OpenSidenav)
    openSidenav(ctx: StateContext<LayoutModel>) {
        const state = ctx.getState();
        ctx.setState({ ...state, showSidenav: true });
    }

    @Action(layoutActions.CloseSidenav)
    closeSidenav(ctx: StateContext<LayoutModel>) {
        const state = ctx.getState();
        ctx.setState({ ...state, showSidenav: false });
    }

    @Action(layoutActions.SetToolbarTitle)
    setToolbarTitle(ctx: StateContext<LayoutModel>, action: layoutActions.SetToolbarTitle) {
        const state = ctx.getState();
        ctx.setState({ ...state, toolbarTitle: action.title });
    }

    @Selector() static isSidenavVisible(state: LayoutModel) {
        return state.showSidenav;
    }

    @Selector() static getToolbarTitle(state: LayoutModel) {
        return state.toolbarTitle;
    }
}