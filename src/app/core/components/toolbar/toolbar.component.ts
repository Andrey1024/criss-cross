import {Component, EventEmitter, OnInit, Output} from '@angular/core';

@Component({
    selector: 'cc-toolbar',
    templateUrl: 'toolbar.component.html',
    styleUrls: ['toolbar.component.scss']
})

export class ToolbarComponent implements OnInit {
    @Output() openSidenav = new EventEmitter();
    
    constructor() {
    }
    
    ngOnInit() {
    }
}