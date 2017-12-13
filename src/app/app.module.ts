import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';

import {StoreModule} from '@ngrx/store';
import {reducers} from './reducers';
import {EffectsModule} from '@ngrx/effects';
import {ApplicationComponent} from './core/containers/application/application.component';
import {CoreModule} from './core/core.module';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {StoreDevtoolsModule} from "@ngrx/store-devtools";

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        StoreModule.forRoot(reducers),
        StoreDevtoolsModule.instrument({
            maxAge: 25
        }),
        EffectsModule.forRoot([]),
        AppRoutingModule,
        CoreModule,
    ],
    providers: [],
    bootstrap: [ApplicationComponent]
})
export class AppModule {
}
