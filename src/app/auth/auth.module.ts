import { NgModule }            from '@angular/core';
import { CommonModule }        from "@angular/common";
import { MaterialModule }      from "../material/material.module";
import { LoginFormComponent }  from "./components/login-form/login-form.component";
import { LoginPageComponent }  from "./containers/login-page/login-page.component";
import { ReactiveFormsModule } from "@angular/forms";
import { CoreModule }          from "../core/core.module";
import { AuthRoutingModule }   from "./auth-routing.module";
import { NgxsFormPluginModule } from "@ngxs/form-plugin";
import { NgxsModule } from "@ngxs/store";
import { AuthState } from "./state/auth.state";
import { HttpClientModule } from "@angular/common/http";
import { LoginFormState } from "./state/login-form.state";

@NgModule({
    imports: [
        CommonModule,
        MaterialModule,
        ReactiveFormsModule,
        CoreModule,
        AuthRoutingModule,
        NgxsFormPluginModule,
        HttpClientModule,
        NgxsModule.forFeature([AuthState, LoginFormState])
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
