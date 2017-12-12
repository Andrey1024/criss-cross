import {Component, Input, OnInit} from '@angular/core';
import {Point} from "../../shared/point.model";

@Component({
    selector: 'cc-field',
    templateUrl: 'field.component.html'
})

export class FieldComponent implements OnInit {
    @Input() crisses: Point[];
    @Input() crosses: Point[];
    
    constructor() {
    }
    
    ngOnInit() {
    }
}