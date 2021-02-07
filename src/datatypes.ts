class Params {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    auto_copy() {
        let copy = JSON.parse(JSON.stringify(this));
        return copy;
    }

    prop(variance: number) {
        const x = this.x + this.box_mueller(variance);
        const y = this.y + this.box_mueller(variance);
        return new Params(x, y);
    }

    box_mueller(variance: number) {
        let u = 0,
            v = 0;
        while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
        while (v === 0) v = Math.random();
        return (
            Math.sqrt(-2.0 * Math.log(u)) *
            Math.cos(2.0 * Math.PI * v) *
            variance
        );
    }

    isLegal() {
        if (this.x < 0 || this.x > 350) return false;
        if (this.y < 0 || this.y > 350) return false;
        return true;
    }
}

//A new result is added for each choice the user makes, and for each automatic rejection.
class Result {
    chosen: Params;
    rejected: Params;
    auto: boolean;
    author: String;

    constructor(yes: Params, no: Params, auto_rejected: boolean = false, session: String) {
        this.chosen = yes;
        this.rejected = no;
        this.auto = auto_rejected;
        this.author = session;
    }

    value() {
        return this.chosen;
    }
}

export {Result, Params};