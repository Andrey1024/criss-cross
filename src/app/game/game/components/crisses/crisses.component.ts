import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Point} from "../../models/point.model";

@Component({
    selector: '[ccCrisses]',
    templateUrl: 'crisses.component.html',
    styleUrls: ['crisses.component.scss']
})

export class CrissesComponent implements OnInit {
    @Input('ccCrisses') crisses: Point[];
    @Output() onClick = new EventEmitter<Point>();
    
    constructor() {
    }
    
    ngOnInit() {
    }
}