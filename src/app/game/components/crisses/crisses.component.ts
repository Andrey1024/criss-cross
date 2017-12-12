import {Component, Input, OnInit} from '@angular/core';
import {Point} from "../../shared/point.model";

@Component({
    selector: '[ccCrisses]',
    templateUrl: 'crisses.component.html'
})

export class CrissesComponent implements OnInit {
    @Input('ccCrisses') crisses: Point[];
    
    constructor() {
    }
    
    ngOnInit() {
    }
}