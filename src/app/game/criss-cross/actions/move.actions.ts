import { Point } from "../models/point.model";

export class MakeMove {
    static readonly type = '[move] Make Move';

    constructor(public move: Point) {
    }
}

export class UserMove {
    static readonly type = '[move] User Move';

    constructor(public move: Point) {
    }
}