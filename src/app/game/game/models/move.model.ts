import {Point} from "./point.model";
import {User} from "../../../auth/models/user.models";

export interface Move {
    point: Point;
    player: User;
    date: number;
}