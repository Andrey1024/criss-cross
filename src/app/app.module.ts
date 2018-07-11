import { BrowserModule } from '@angular/platform-browser';
import { NgModule }      from '@angular/core';

import { AppRoutingModule }          from './app-routing.module';
import { ApplicationComponent }      from './core/containers/application/application.component';
import { CoreModule }                from './core/core.module';
import { BrowserAnimationsModule }   from '@angular/platform-browser/animations';
import { StompConfig, StompService } from "@stomp/ng2-stompjs";
import * as SockJS                   from 'sockjs-client';
import { WebSocketService }          from "./services/web-socket.service";
import { NgxsModule }                from "@ngxs/store";
import { AuthModule }                from "./auth/auth.module";

export function socketProvider() {
    return new SockJS('/criss-cross');
}

const stompConfig: StompConfig = {
    // Which server?
    url: socketProvider,

    // Headers
    // Typical keys: login, passcode, host
    headers: {
        login: '', passcode: ''
    },

    // How often to heartbeat?
    // Interval in milliseconds, set to 0 to disable
    heartbeat_in: 0, // Typical value 0 - disabled
    heartbeat_out: 20000, // Typical value 20000 - every 20 seconds

    // Wait in milliseconds before attempting auto reconnect
    // Set to 0 to disable
    // Typical value 5000 (5 seconds)
    reconnect_delay: 5000,

    // Will log diagnostics on console
    debug: true
};

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        CoreModule,
        AuthModule,
        NgxsModule.forRoot()
    ],
    providers: [
        // StompService,
        // {
        //     provide: StompConfig, useValue: stompConfig
        // },
        // WebSocketService
    ],
    bootstrap: [ApplicationComponent]
})
export class AppModule {
}