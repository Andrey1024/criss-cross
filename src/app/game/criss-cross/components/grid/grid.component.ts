import { ChangeDetectionStrategy, Component, Input, OnChanges, OnInit } from '@angular/core';

@Component({
    selector: '[ccGrid]',
    templateUrl: 'grid.component.html',
    styleUrls: ['grid.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})

export class GridComponent implements OnInit, OnChanges {
    @Input() sizeX: number = 15;
    @Input() sizeY: number = 15;

    xIterator = [];
    yIterator = [];

    constructor() {
    }

    private getIterator(size: number) {
        return new Array(size + 1).fill(0).map((v, i) => i);
    }

    ngOnChanges() {
        this.xIterator = this.getIterator(this.sizeX);
        this.yIterator = this.getIterator(this.sizeY);
    }

    ngOnInit() {
    }
}