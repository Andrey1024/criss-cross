import {NgModule} from '@angular/core';
import {CommonModule} from "@angular/common";
import {MaterialModule} from "../../material/material.module";
import {CrissesComponent} from "./crisses/crisses.component";
import {CrossesComponent} from "./crosses/crosses.component";
import {FieldComponent} from "./field/field.component";
import {GridComponent} from "./grid/grid.component";

const COMPONENTS = [
    CrissesComponent,
    CrossesComponent,
    FieldComponent,
    GridComponent
];


@NgModule({
    imports: [
        CommonModule,
        MaterialModule
    ],
    exports: [COMPONENTS],
    declarations: [COMPONENTS],
    providers: [],
})
export class ComponentsModule {
}
