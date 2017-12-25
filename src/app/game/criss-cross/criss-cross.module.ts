import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CrissCrossRoutingModule} from './criss-cross-routing.module';
import {GamePageComponent} from './containers/game/game-page.component';
import {ComponentsModule} from './components/components.module';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {reducers} from '../reducers/index';
import {HttpClientModule} from '@angular/common/http';
import {MoveEffects} from "./effects/move.effects";
import {CoreModule} from "../../core/core.module";
import {ChatModule} from "./chat/chat.module";
import {FlexLayoutModule} from "@angular/flex-layout";

@NgModule({
    imports: [
        CommonModule,
        CrissCrossRoutingModule,
        ComponentsModule,
        StoreModule.forFeature('game', reducers),
        EffectsModule.forFeature([MoveEffects]),
        HttpClientModule,
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
