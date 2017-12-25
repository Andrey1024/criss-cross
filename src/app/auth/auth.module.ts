import {NgModule} from '@angular/core';
import {CommonModule} from "@angular/common";
import {MaterialModule} from "../material/material.module";
import {LoginFormComponent} from "./components/login-form/login-form.component";
import {LoginPageComponent} from "./containers/login-page/login-page.component";
import {ReactiveFormsModule} from "@angular/forms";

@NgModule({
    imports: [
        CommonModule,
        MaterialModule,
        ReactiveFormsModule
    ],
    exports: [],
    declarations: [
        LoginFormComponent,
        LoginPageComponent
    ],
    providers: [],
})
export class AuthModule {
}
