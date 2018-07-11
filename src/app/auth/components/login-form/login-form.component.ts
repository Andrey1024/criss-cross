import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormControl, FormGroup }                 from "@angular/forms";

@Component({
    selector: "cc-login-form",
    templateUrl: "login-form.component.html"
})
export class LoginFormComponent {
    loginGroup = new FormGroup({
        login: new FormControl(), pass: new FormControl()
    });

    @Input() pending;
    @Input() error: string;

    @Output() submit = new EventEmitter();
}