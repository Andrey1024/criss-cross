import { NgModule }         from '@angular/core';
import { CommonModule }     from "@angular/common";
import { CrissCrossModule } from "./criss-cross/criss-cross.module";
import { PlayerListModule } from "./player-list/player-list.module";

@NgModule({
    imports: [
        CommonModule,
        CrissCrossModule,
        PlayerListModule
    ],
    exports: [],
    declarations: [],
    providers: [],
})
export class GameModule {
}
