import {AfterViewInit, Component, Input, OnChanges, OnInit, TrackByFunction, ViewChild} from '@angular/core';
import {User} from "../../../../auth/models/user.models";
import {MatPaginator, MatSort, MatTableDataSource} from "@angular/material";

@Component({
    selector: 'cc-player-list',
    templateUrl: 'player-list.component.html'
})

export class PlayerListComponent implements OnInit, OnChanges, AfterViewInit {
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    
    @Input() users: User[];
    
    dataSource = new MatTableDataSource<User>();
    displayedColumns = ["name", "elo"];
    
    trackById: TrackByFunction<User> = (i, user) => user.id;
    
    constructor() {
    }
    
    ngOnInit() {
    }
    
    ngOnChanges() {
        this.dataSource.data = this.users;
    }
    
    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }
}