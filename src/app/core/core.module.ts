import {NgModule} from '@angular/core';
import {MaterialModule} from "../material/material.module";
import {LayoutComponent} from "./components/layout/layout.component";
import {NavItemComponent} from "./components/nav-item/nav-item.component";
import {SidenavComponent} from "./components/sidenav/sidenav.component";
import {ApplicationComponent} from "./containers/application/application.component";
import {ToolbarComponent} from "./components/toolbar/toolbar.component";
import {RouterModule} from "@angular/router";
import {CommonModule} from "@angular/common";
import {PageComponent} from "./containers/page/page.component";
import {FlexLayoutModule} from "@angular/flex-layout";

const COMPONENTS = [
    LayoutComponent,
    NavItemComponent,
    SidenavComponent,
    ApplicationComponent,
    ToolbarComponent,
    PageComponent
];

@NgModule({
    imports: [
        MaterialModule,
        RouterModule,
        CommonModule,
        FlexLayoutModule
    ],
    exports: [COMPONENTS],
    declarations: [COMPONENTS],
    providers: [],
})
export class CoreModule {
}
