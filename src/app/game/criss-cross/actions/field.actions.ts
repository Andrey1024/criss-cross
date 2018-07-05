import { Point } from "../models/point.model";

export class MakeMove {
    static readonly type = '[game] Make Move';

    constructor(public move: Point) {
    }
}