import {User} from "../../auth/models/user.models";
import {Move} from "./move.model";

export interface Game {
    id: number;
    crissPlayer: User | null;
    crossPlayer: User | null;
    moves: Move[];
    start: number;
    end: number;
}