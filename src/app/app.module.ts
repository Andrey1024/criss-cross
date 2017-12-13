import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';

import {StoreModule} from "@ngrx/store";
import {reducers} from "./reducers";
import {EffectsModule} from "@ngrx/effects";
import {ApplicationComponent} from "./core/containers/application/application.component";
import {CoreModule} from "./core/core.module";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {GameModule} from "./game/game.module";

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        StoreModule.forRoot(reducers),
        EffectsModule.forRoot([]),
        AppRoutingModule,
        CoreModule,
        GameModule
    ],
    providers: [],
    bootstrap: [ApplicationComponent]
})
export class AppModule {
}
