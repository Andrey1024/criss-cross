import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Point }                                                                   from "../../models/point.model";

@Component({
    selector: '[ccCrosses]',
    templateUrl: 'crosses.component.html',
    styleUrls: ['crosses.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})

export class CrossesComponent implements OnInit {
    @Input('ccCrosses') crosses: Point[];
    @Output() onClick = new EventEmitter<Point>();

    constructor() {
    }

    ngOnInit() {
    }
}