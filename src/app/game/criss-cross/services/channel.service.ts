import {Injectable} from '@angular/core';
import {StompService} from "@stomp/ng2-stompjs";

@Injectable()
export class ChannelService {
    private stomp;
    
    constructor(private stompService: StompService) {
        this.stomp = stompService.subscribe("/channel/public")
    }
    
    getChannel() {
        return this.stomp;
    }
}