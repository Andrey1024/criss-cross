import { Move } from "./move.model";
import { User } from "../../../auth/models/user.models";

export interface Game {
    id: number;
    crissPlayer: User | null;
    crossPlayer: User | null;
    moves: Move[];
    start: number;
    end: number;
}