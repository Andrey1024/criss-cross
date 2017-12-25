import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

const routes: Routes = [
    {path: 'game', loadChildren: 'app/game/game.module#GameModule'},
    {path: 'admin', loadChildren: 'app/admin/admin.module#AdminModule'}
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {
}

