class Params {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    auto_copy() {
        let copy = new Params(this.x, this.y);
        return copy;
    }

    prop(variance: number) {
        const x = this.x + Params.box_mueller(variance);
        const y = this.y + Params.box_mueller(variance);
        return new Params(Math.round((x + Number.EPSILON) * 100) / 100, Math.round((y + Number.EPSILON) * 100) / 100);
    }

    isLegal() {
        if (this.x < 0 || this.x > 350) return false;
        if (this.y < 0 || this.y > 350) return false;
        return true;
    }

    static reform({x, y}){
        return new Params(x,y);
    }

    static box_mueller(variance: number) {
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

    static new_uniform() {
        return new Params(
            Math.floor(Math.random() * 350),
            Math.floor(Math.random() * 350)
        );
    }
}

//A new result is added for each choice the user makes, and for each automatic rejection.
interface Result {
    rejected: Params;
    auto: boolean;
    author: String;
    chosen: Params;

}

enum lineage_status {
    New,
    Free,
    Busy,
    Converged,
}

enum instruction_font {
    OpenSans,
    PlayfairDisplay,
}

enum question_word {
    professional,
    readable,
}

const NUMBER_OF_CHAINS: number = 3;

interface session_out {
    //Session object used in check-out process
    id: String;
    font: instruction_font;
    question: question_word;
    heads: Params[];
    lineage_ID: String;
}

interface session_in {
    lineage_ID: String;
    id: String;
    accept: boolean;
    chains: Result[][];
}

export {
    Params,
    Result,
    lineage_status,
    instruction_font,
    question_word,
    NUMBER_OF_CHAINS,
    session_out,
    session_in,
};
