import {Component, Input, OnChanges, OnInit, TrackByFunction} from '@angular/core';
import {User} from "../../../../auth/models/user.models";
import {MatTableDataSource} from "@angular/material";

@Component({
    selector: 'cc-player-list',
    templateUrl: 'player-list.component.html'
})

export class PlayerListComponent implements OnInit, OnChanges {
    @Input() users: User[];
    
    dataSource = new MatTableDataSource<User>();
    
    trackById: TrackByFunction<User> = (i, user) => user.id;

    constructor() {
    }
    
    ngOnInit() {
    }
    
    ngOnChanges() {
        this.dataSource.data = this.users;
    }
}