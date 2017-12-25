import {Component} from '@angular/core';
import {Store} from '@ngrx/store';
import * as fromAuth from '../../reducers';

@Component({
    selector: 'cc-login-page'
})
export class LoginPageComponent {
    constructor(private store: Store<fromAuth.State>) {
    }
    
}