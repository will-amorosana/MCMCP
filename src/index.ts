//Sleep function- not used, mostly for testing
// function sleep(ms) {
//     return new Promise((resolve) => setTimeout(resolve, ms));
// }

//This is how coordinates are passed between methods. It's basically just a tuple that can check if it's beyond bounds [0,350].
// const ParamTypes = Object.freeze({ USER_DEFINED: 1, EMPTY: 2, AUTO_REJECT: 3 });



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

    constructor(yes: Params, no: Params, auto_rejected: boolean) {
        this.chosen = yes;
        this.rejected = no;
        this.auto = auto_rejected;
    }

    value(){
        return this.chosen;3
    }
}

//Chains hold their own proposal variance, their previous results, and their current run.
class Chain {
    prop_var: number;
    current_run: Result[];
    results: Result[];
    old_head: Params;
    constructor(prop_var: number = 10) {
        this.prop_var = prop_var;
        this.old_head = null;
        this.current_run = [];
        this.results = [];
    }

    addPoint(x: Result) {
        //Adds a new result to the end of the array
        this.current_run.push(x);
    }

    state() { //TODO: draw from DB
        //Returns the most recent point in the current run. If it's an empty array, returns null (behavior handled below)
        if (this.current_run.length == 0) {
            //If this is the first iteration of the current run, check for previous runs
            return this.old_head; //May return NULL if this is there haven't been any former accepted runs
        } else {
            //If it's not the first step in the run, return the head of the current run
            return this.current_run[this.current_run.length - 1].value();
        }
    }

    update(ok: boolean) {
        if (ok) {
            //If it's all good, append the results and change the old_head.
            this.old_head = this.current_run[this.current_run.length - 1].value();
            this.results.push(...this.current_run);
            this.current_run = [];
        } else {
            //If the check-out protection comes up bogus, just clear it and move on
            this.current_run = [];
        }
    }
}


class Main {

    chains: Chain[];
    c1: HTMLCanvasElement;
    c2: HTMLCanvasElement;
    panel1: CanvasRenderingContext2D;
    panel2: CanvasRenderingContext2D;
    side1: Params;
    side2: Params;
    current_chain: Chain;
    inputs: boolean[];
    iters: number;
    //Checkout prevention hyperparameters
    k: number;
    t: number;

    constructor(num_chains, iters, k, t, prop_var) {
        //Initialize Chains
        this.iters = iters;
        this.k = k;
        this.t = t;
        this.chains = [];
        for(let i = 0; i < num_chains; i++){
            this.chains.push(new Chain(prop_var));
        }
        this.current_chain = this.chains[0];

        //Get references for HTML elements
        this.c1 = document.getElementById("canvas_1") as HTMLCanvasElement;
        this.c2 = document.getElementById("canvas_2") as HTMLCanvasElement;
        this.panel1 = this.c1.getContext("2d");
        this.panel2 = this.c2.getContext("2d");

        this.side1 = null;
        this.side2 = null;

        this.inputs = []

        this.c1.addEventListener("click", () => {
            this.process_input(false);
        });
        this.c2.addEventListener("click", () => {
            this.process_input(true);
        });

        document.addEventListener('keydown', (e) => {
            if (e.code == 'KeyA'){
                this.process_input(false);
            } else if (e.code == 'KeyD'){
                this.process_input(true);
            }
        });

    }

    next_chain() {
        if (this.current_chain == this.chains[this.chains.length-1]){
            this.current_chain = this.chains[0];
            this.iters--;
        }else{
            let next_index = this.chains.findIndex((chain)=> chain == this.current_chain)+1;
            this.current_chain = this.chains[next_index];
        }
        if ((this.iters == 0)) {
            this.end_run();
        } else {
            this.prep_chain();
        }
    }

    prep_chain() {
        let old_params: Params = this.current_chain.state(); //Get the last point from the current chain
        let new_params: Params = null;
        if (old_params == null) {
            //If it's empty (a new chain), generate uniformly random values for all parameters for both choices
            old_params = new Params(
                Math.floor(Math.random() * 350),
                Math.floor(Math.random() * 350),
            );
            new_params = new Params(
                Math.floor(Math.random() * 350),
                Math.floor(Math.random() * 350),
            );
        } else {
            //If you did get a state, create a proposed state by modifying the old one by the proposal distribution
            new_params = old_params.prop(this.current_chain.prop_var);
            while (!new_params.isLegal()) {
                //If you generate out-of-bounds parameters, auto-reject and retry until you get legal ones
                //console.log("Illegal parameters! Auto-rejecting...")
                this.current_chain.addPoint(new Result(old_params.auto_copy(), new_params.auto_copy(), true));
                new_params = old_params.prop(this.current_chain.prop_var);
            }
        }
        this.side1 = old_params;
        this.side2 = new_params;

        this.render();
    }

    render() {
        function ellipse(context, cx, cy, rx, ry) {
            context.clearRect(0, 0, cx * 2, cy * 2);
            context.save(); // save state
            context.beginPath();

            context.translate(cx - rx, cy - ry);
            context.scale(rx, ry);
            context.arc(1, 1, 1, 0, 2 * Math.PI, false);

            context.restore(); // restore to original state
            context.stroke();
        }
        if (Math.random() > 0.5) {
            //Swap them half the time
            let temp = this.side1;
            this.side1 = this.side2;
            this.side2 = temp;
        }
        ellipse(this.panel1, 350, 350, this.side1.x, this.side1.y);
        ellipse(this.panel2, 350, 350, this.side2.x, this.side2.y);
    }

    process_input(right: boolean) {
        let new_state: Result = null;
        if (right) {
            new_state = new Result(this.side2, this.side1, false);
            this.inputs.push(true);
        } else {
            new_state = new Result(this.side1, this.side2, false);
            this.inputs.push(false);
        }
        this.current_chain.addPoint(new_state);
        this.next_chain();
    }

    end_run(){
        let run_ok: boolean = this.checkout_eval(8, .8);
        console.log("Done! Run OK: "+run_ok);
        for(let i = 0; i < this.chains.length; i++){
            this.chains[i].update(run_ok);
        }
    }

    checkout_eval(k: number, t: number) {
        let alt_len: number = 0;
        let same_len: number = 0;
        let left_count = 0;
        let right_count = 0;
        let alt_count = 0;
        let last_val: boolean = null;
        for(let i: number = 0; i < this.inputs.length; i++){
            this.inputs[i] ? right_count++ : left_count++;
            if(this.inputs[i]==last_val){
                alt_count++;
                same_len++;
                alt_len= 0;
                if(same_len >= k) return false;
            }else{
                alt_len++;
                same_len = 0;
                last_val = !last_val;
                if(alt_len >= k) return false;
            }
        }
        if(t <= Math.max(left_count, right_count, alt_count)/this.inputs.length) return false;

        return true;


    }


}

let main = new Main(5, 5, 10, .8, 5);
main.prep_chain();
