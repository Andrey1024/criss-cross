import { Component } from '@angular/core';
import { Store }     from "@ngxs/store";
import { Login }     from "../../actions/auth.actions";

@Component({
    selector: 'cc-login-page',
    templateUrl: "login-page.component.html"
})
export class LoginPageComponent {
    constructor(private store: Store) {
    }


    onSubmit() {
        this.store.dispatch(new Login());
    }
}