import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'cc-nav-item',
    templateUrl: 'nav-item.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavItemComponent {
    @Input() icon = '';
    @Input() hint = '';
    @Input() routerLink: string | any[] = '/';
    @Output() navigate = new EventEmitter();

}