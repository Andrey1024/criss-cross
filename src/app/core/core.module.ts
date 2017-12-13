import {NgModule} from '@angular/core';
import {MaterialModule} from "../material/material.module";
import {LayoutComponent} from "./components/layout/layout.component";
import {NavItemComponent} from "./components/nav-item/nav-item.component";
import {SidenavComponent} from "./components/sidenav/sidenav.component";
import {ApplicationComponent} from "./containers/application/application.component";
import {ToolbarComponent} from "./components/toolbar/toolbar.component";
import {RouterModule} from "@angular/router";
import {CommonModule} from "@angular/common";

const COMPONENTS = [
    LayoutComponent,
    NavItemComponent,
    SidenavComponent,
    ApplicationComponent,
    ToolbarComponent
];

@NgModule({
    imports: [MaterialModule, RouterModule, CommonModule],
    exports: [COMPONENTS],
    declarations: [COMPONENTS],
    providers: [],
})
export class CoreModule {
}
