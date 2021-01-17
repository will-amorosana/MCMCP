//Sleep function- not used, mostly for testing
// function sleep(ms) {
//     return new Promise((resolve) => setTimeout(resolve, ms));
// }

//This is how coordinates are passed between methods. It's basically just a tuple that can check if it's beyond bounds [0,350].
// const ParamTypes = Object.freeze({ USER_DEFINED: 1, EMPTY: 2, AUTO_REJECT: 3 });

enum ParamTypes {
    UserDefined,
    Empty,
    AutoReject,
}

class Params {
    x: number;
    y: number;
    paramType = ParamTypes.UserDefined;

    constructor(x: number, y: number, type: ParamTypes) {
        this.paramType = type;
        if (this.paramType == ParamTypes.UserDefined) {
            this.x = x;
            this.y = y;
        } else {
            this.x = -1;
            this.y = -1;
        }
    }

    auto_copy() {
        let copy = JSON.parse(JSON.stringify(this));
        copy.param_type = ParamTypes.AutoReject;
        return copy;
    }

    prop(variance: number) {
        const x = this.x + this.box_mueller(variance);
        const y = this.y + this.box_mueller(variance);
        return new Params(x, y, ParamTypes.UserDefined);
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

//Chains hold their own proposal variance and an array of Params as results.
//Chains hold their own proposal variance, their previous results, and their current run.
class Chain {
    prop_var: number;
    current_run: Params[];
    results: Params[];
    old_head: Params;
    constructor(prop_var: number = 10) {
        this.prop_var = prop_var;
        this.old_head = new Params(-1, -1, ParamTypes.Empty);
        this.current_run = [];
        this.results = [];
    }

    addPoint(x: Params) {
        //Adds a new result to the end of the array
        this.current_run.push(x);
    }

    state() {
        //Returns the most recent point in the current run. If it's an empty array, returns null (behavior handled below)
        if (this.current_run.length == 0) {
            //If this is the first iteration of the current run, check for previous runs
            if (this.old_head.paramType != ParamTypes.Empty) {
                return this.old_head; //If there is one, forward its last point.
            } else return null; //Otherwise tell it to scratch it.
        } else {
            //If it's not the first step in the run, return the head of the current run
            return this.current_run[this.current_run.length - 1];
        }
    }

    update(ok: boolean) {
        if (ok) {
            //If it's all good, append the results and change the old_head.
            this.old_head = this.current_run[this.current_run.length - 1];
            this.results.push(...this.current_run);
            this.current_run = [];
        } else {
            //If the check-out protection comes up bogus, just clear it and move on
            this.current_run = [];
        }
    }
}


class Main {
    chain_a: Chain;
    chain_b: Chain;
    chain_c: Chain;
    c1: HTMLCanvasElement;
    c2: HTMLCanvasElement;
    panel1: CanvasRenderingContext2D;
    panel2: CanvasRenderingContext2D;
    side1: Params;
    side2: Params;
    current_chain: Chain;
    inputs: boolean[];
    iters: number;

    constructor() {
        //Initialize Chains
        this.iters = 100;
        this.chain_a = new Chain(20);
        this.chain_b = new Chain(10);
        this.chain_c = new Chain(5);
        this.current_chain = this.chain_a;

        //Get references for HTML elements
        this.c1 = document.getElementById("canvas_1") as HTMLCanvasElement;
        this.c2 = document.getElementById("canvas_2") as HTMLCanvasElement;
        this.panel1 = this.c1.getContext("2d");
        this.panel2 = this.c2.getContext("2d");

        this.side1 = new Params(-1, -1, ParamTypes.Empty);
        this.side2 = new Params(-1, -1, ParamTypes.Empty);

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
        let new_state = null;
        if (right) {
            new_state = this.side2;
            this.inputs.push(true);
        } else {
            new_state = this.side1;
            this.inputs.push(false);
        }
        this.current_chain.addPoint(new_state);
        this.next_chain();
    }

    next_chain() {
        if (this.current_chain == this.chain_a)
            this.current_chain = this.chain_b;
        else if (this.current_chain == this.chain_b)
            this.current_chain = this.chain_c;
        else if (this.current_chain == this.chain_c) {
            this.current_chain = this.chain_a;
            this.iters--;
        } else console.error("Something has gone horribly wrong");
        if ((this.iters == 0)) {
            this.end_run();
        } else {
            this.prep_chain();
        }
    }

    end_run() {
        console.log("Done!");
        console.log(this.inputs.toString());
    }

    prep_chain() {
        let old_params = this.current_chain.state(); //Get the last point from the current chain
        let new_params = null;
        if (old_params == null) {
            //If it's empty (a new chain), generate uniformly random values for all parameters for both choices
            old_params = new Params(
                Math.floor(Math.random() * 350),
                Math.floor(Math.random() * 350),
                ParamTypes.UserDefined
            );
            new_params = new Params(
                Math.floor(Math.random() * 350),
                Math.floor(Math.random() * 350),
                ParamTypes.UserDefined
            );
        } else {
            //If you did get a state, create a proposed state by modifying the old one by the proposal distribution
            new_params = old_params.prop(this.current_chain.prop_var);
            while (!new_params.isLegal()) {
                //If you generate out-of-bounds parameters, auto-reject and retry until you get legal ones
                //console.log("Illegal parameters! Auto-rejecting...")
                this.current_chain.addPoint(old_params.auto_copy());
                new_params = old_params.prop(this.current_chain.prop_var);
            }
        }
        this.side1 = old_params;
        this.side2 = new_params;

        this.render();
    }

    logKey(e: KeyboardEvent) {

    }


}

let main = new Main();
main.iters = 5;
main.prep_chain();
