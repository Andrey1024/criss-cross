import {Component, Input, OnInit} from '@angular/core';

@Component({
    selector: 'cc-sidenav',
    templateUrl: 'sidenav.component.html',
    styleUrls: ['sidenav.component.scss']
})

export class SidenavComponent implements OnInit {
    @Input() opened: boolean;
    
    constructor() {
    }
    
    ngOnInit() {
    }
}