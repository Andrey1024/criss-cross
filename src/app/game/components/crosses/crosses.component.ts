import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Point} from "../../shared/point.model";

@Component({
    selector: '[ccCrosses]',
    templateUrl: 'crosses.component.html'
})

export class CrossesComponent implements OnInit {
    @Input('ccCrosses') crosses: Point[];
    @Output() onClick = new EventEmitter<Point>();
    
    constructor() {
    }
    
    ngOnInit() {
    }
}