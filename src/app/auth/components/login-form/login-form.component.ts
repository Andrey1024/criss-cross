import {Component, EventEmitter, Input, Output} from "@angular/core";
import {Authenticate} from "../../models/authenticate.model";

@Component({
    selector: "cc-login-form"
})
export class LoginFormComponent {
    @Input() pending;
    @Input() error: string;
    
    @Output() submit = new EventEmitter<Authenticate>();
}