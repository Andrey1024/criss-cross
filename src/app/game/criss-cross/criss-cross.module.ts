import { NgModule }                from '@angular/core';
import { CommonModule }            from '@angular/common';
import { CrissCrossRoutingModule } from './criss-cross-routing.module';
import { GamePageComponent }       from './containers/game/game-page.component';
import { ComponentsModule }        from './components/components.module';
import { HttpClientModule }        from '@angular/common/http';
import { CoreModule }              from "../../core/core.module";
import { ChatModule }              from "./chat/chat.module";
import { FlexLayoutModule }        from "@angular/flex-layout";
import { NgxsModule }              from "@ngxs/store";
import { GameState }               from "./state/game.state";

@NgModule({
    imports: [
        CommonModule,
        CrissCrossRoutingModule,
        ComponentsModule,
        HttpClientModule,
        NgxsModule.forFeature([GameState]),
        CoreModule,
        ChatModule,
        FlexLayoutModule
    ],
    exports: [],
    declarations: [
        GamePageComponent
    ],
    providers: [],
})
export class CrissCrossModule {
}
