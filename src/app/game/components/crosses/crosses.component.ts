import {Component, Input, OnInit} from '@angular/core';
import {Point} from "../../shared/point.model";

@Component({
    selector: '[ccCrosses]',
    templateUrl: 'crosses.component.html'
})

export class CrossesComponent implements OnInit {
    @Input('ccCrosses') crosses: Point[];
    
    constructor() {
    }
    
    ngOnInit() {
    }
}