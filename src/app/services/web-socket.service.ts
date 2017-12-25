import {Injectable} from '@angular/core';
import {StompService} from "@stomp/ng2-stompjs";
import {Observable} from "rxjs/Observable";
import {Message} from "@stomp/stompjs";

@Injectable()
export class WebSocketService {
    channels = new Map<string, Observable<Message>>()
    
    constructor(private stompService: StompService) {
    }
    
    getChannel(name: string): Observable<Message> {
        if (!this.channels.has(name)) {
            this.channels.set(name, this.stompService.subscribe(name));
        }
        return this.channels.get(name);
    }
    
    sendMessage(path: string, message: any) {
        this.stompService.publish(path, JSON.stringify(message));
    }
}