import { ChangeDetectionStrategy, Component, EventEmitter, OnChanges, OnInit, Output } from '@angular/core';

@Component({
    selector: 'cc-toolbar',
    templateUrl: 'toolbar.component.html',
    styleUrls: ['toolbar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})

export class ToolbarComponent implements OnInit, OnChanges {
    @Output() openSidenav = new EventEmitter();

    constructor() {
    }

    ngOnChanges() {
    }

    ngOnInit() {
    }
}