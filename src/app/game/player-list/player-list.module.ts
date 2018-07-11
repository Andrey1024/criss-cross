import { NgModule }                from '@angular/core';
import { CommonModule }            from "@angular/common";
import { MaterialModule }          from "../../material/material.module";
import { FlexLayoutModule }        from "@angular/flex-layout";
import { PlayerListComponent }     from "./components/player-list/player-list.component";
import { PlayerListPageComponent } from "./containers/player-list-page/player-list-page.component";
import { CoreModule }              from "../../core/core.module";


@NgModule({
    imports: [
        CommonModule,
        MaterialModule,
        FlexLayoutModule,
        CoreModule
    ],
    exports: [],
    declarations: [
        PlayerListComponent,
        PlayerListPageComponent
    ],
    providers: [],
})
export class PlayerListModule {
}
