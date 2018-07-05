import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Authenticate }                           from "../../models/authenticate.model";
import { FormControl, FormGroup }                 from "@angular/forms";

@Component({
    selector: "cc-login-form"
})
export class LoginFormComponent {
    loginGroup = new FormGroup({
        login: new FormControl(), pass: new FormControl()
    });

    @Input() pending;
    @Input() error: string;

    @Output() submit = new EventEmitter<Authenticate>();
}