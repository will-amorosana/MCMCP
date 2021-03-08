class Params {//A wrapper for an array of integer values [0,100]
    values: number[];

    constructor(values: number[]) {
        if(values.length != 16){
            console.log("Something is very wrong- I just saw a Params object with length != 16 :(")
        }else this.values = values;
    }

    static new_uniform() {
        let out_values: number[] = [];
        for(let i: number = 0; i < 16; i++){//Confirmed this works in scratch.js
            out_values.push(Math.floor(Math.random() * 101))
        }
        return new Params(out_values);
    }

    prop(variance: number) {
        let out_values: number[] = [];
        for(let i: number = 0; i < this.values.length; i++){
            out_values.push(this.values[i] + Params.box_mueller(variance))
        }
        return new Params(out_values);
    }

    isLegal() {
        for(let i: number = 0; i < 16; i++){
            if(this.values[i]>100 || this.values[i] < 0) return false
        }
        return true
    }


    static box_mueller(variance: number) {//TODO: Student's T perhaps???
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
    Georgia,
    Arial,
}


const NUMBER_OF_CHAINS: number = 3;

interface session_out {
    //Session object used in check-out process
    id: String;
    font: instruction_font;
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
    NUMBER_OF_CHAINS,
    session_out,
    session_in,
};
