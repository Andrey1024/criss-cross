import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';

import {StoreModule} from "@ngrx/store";
import {reducers} from "./reducers";
import {EffectsModule} from "@ngrx/effects";
import {ApplicationComponent} from "./core/containers/application/application.component";


@NgModule({
    declarations: [
        ApplicationComponent
    ],
    imports: [
        BrowserModule,
        StoreModule.forRoot(reducers),
        EffectsModule.forRoot([]),
        AppRoutingModule
    ],
    providers: [],
    bootstrap: [ApplicationComponent]
})
export class AppModule {
}
