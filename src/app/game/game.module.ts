import {NgModule} from '@angular/core';
import {FieldComponent} from "./components/field/field.component";
import {GridComponent} from "./components/grid/grid.component";
import {CommonModule} from "@angular/common";
import {GameRoutingModule} from "./game-routing.module";
import {CrissesComponent} from "./components/crisses/crisses.component";
import {CrossesComponent} from "./components/crosses/crosses.component";
import {GamePageComponent} from "./containers/game/game-page.component";
import {ComponentsModule} from "./components/components.module";

@NgModule({
    imports: [CommonModule, GameRoutingModule, ComponentsModule],
    exports: [],
    declarations: [
        GamePageComponent
    ],
    providers: [],
})
export class GameModule {
}
