import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
    selector: 'cc-layout',
    templateUrl: 'layout.component.html',
    styleUrls: ['layout.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutComponent implements OnInit {
    constructor() {
    }

    ngOnInit() {
    }
}