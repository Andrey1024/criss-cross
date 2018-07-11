import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { Point }                                                                                   from '../../models/point.model';

@Component({
    selector: 'cc-field',
    templateUrl: 'field.component.html',
    host: {
        style: "flex;"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})

export class FieldComponent implements OnInit {
    @Output() onClick = new EventEmitter<Point>();

    @ViewChild('field') field: ElementRef;

    sizeX = 15;
    sizeY = 15;

    constructor() {
    }

    click(event: MouseEvent) {
        const bbox = (<SVGElement>this.field.nativeElement).getBoundingClientRect();
        const width = bbox.width;
        const height = bbox.height;
        const cellX = width / this.sizeX;
        const cellY = height / this.sizeY;
        const x = Math.floor(event.offsetX / cellX);
        const y = Math.floor(event.offsetY / cellY);
        this.onClick.emit({ x, y });
        console.log({ x, y });
    }

    ngOnInit() {
    }
}