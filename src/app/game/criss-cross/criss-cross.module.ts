import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CrissCrossRoutingModule} from './criss-cross-routing.module';
import {GamePageComponent} from './containers/game/game-page.component';
import {ComponentsModule} from './components/components.module';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {reducers} from './reducers';

@NgModule({
    imports: [
        CommonModule,
        CrissCrossRoutingModule,
        ComponentsModule,
        StoreModule.forFeature('game', reducers),
        EffectsModule.forFeature([])
    ],
    exports: [],
    declarations: [
        GamePageComponent
    ],
    providers: [],
})
export class CrissCrossModule {
}
