//Sleep function- not used, mostly for testing
// function sleep(ms) {
//     return new Promise((resolve) => setTimeout(resolve, ms));
// }

import {Result, Params, lineage_status, instruction_font, question_word, NUMBER_OF_CHAINS, session_out, session_in} from "./datatypes";

const axios = require('axios');
//CONSTANTS
const SCRIVENER_URL: String = 'http://localhost:3000';
const ITERATIONS: number = 3; //The number of iterations PER CHAIN. Total choices = this * NUMBER_OF_CHAINS
const INPUT_STREAK_THRESHOLD: number = 20 //probability of 20 straight lefts/rights/alts ~= 1 in a million
const INPUT_SHARE_THRESHOLD: number = .9 //Probability of number of rights being above 54% = 1 in a million TODO: Revert to .55
const PROPOSAL_VARIANCE: number = 10;//For fonts, starting around .1 is a good start for most values.

//Chains hold their own proposal variance and their current run's results.
class Chain {
    prop_var: number;
    current_run: Result[];
    constructor(prop_var: number = 10) {
        this.prop_var = prop_var;
        this.current_run = [];
    }

    addPoint(x: Result) {
        //Adds a new result to the end of the array
        this.current_run.push(x);
    }

    state() {
        //TODO: draw from DB
        //Returns the most recent point in the current run. If it's an empty array, returns null (behavior handled below)
        if (this.current_run.length == 0) {
            //If this is the first iteration of the current run, return null
            return null;
        } else {
            //If it's not the first step in the run, return the head of the current run
            return this.current_run[this.current_run.length - 1].value();
        }
    }


}//TODO: Just make this a damn list of Results



class Main {
    chains: Chain[];

    //HTML Elements and their associated values
    c1: HTMLCanvasElement= document.getElementById("canvas_1") as HTMLCanvasElement;
    c2: HTMLCanvasElement= document.getElementById("canvas_2") as HTMLCanvasElement;
    panel1: CanvasRenderingContext2D = this.c1.getContext("2d");
    panel2: CanvasRenderingContext2D = this.c2.getContext("2d");
    side1: Params = null;
    side2: Params = null;

    //Values for use during run
    current_chain: number = 0;
    inputs: boolean[] = [];
    iters: number= ITERATIONS;

    //Checkout prevention hyperparameters
    k: number = INPUT_STREAK_THRESHOLD;
    t: number = INPUT_SHARE_THRESHOLD;

    //Info to be taken from server
    font_of_choice: instruction_font;
    question: question_word;
    seshID: String;
    lineage_ID: String;
    heads: Params[];

    constructor() {
        //Initialize Chains
        this.chains = [];
        for (let i = 0; i < NUMBER_OF_CHAINS; i++) {
            this.chains.push(new Chain(PROPOSAL_VARIANCE));
        }

        //Gather data from server
        this.retrieve()
            .then(function(ok) {
                if(ok) console.log("Successfully retrieved session!");
                else server_full();
            });


        this.c1.addEventListener("click", () => {
            this.process_input(false);
        });
        this.c2.addEventListener("click", () => {
            this.process_input(true);
        });

        document.addEventListener("keydown", (e) => {
            if (e.code == "KeyA") {
                this.process_input(false);
            } else if (e.code == "KeyD") {
                this.process_input(true);
            }
        });
    }

    async retrieve() {
        //Checkout stuff
        const response = await axios.get(SCRIVENER_URL+"/checkout/");
        if(response.data == "Unavailable!"){
            return false;
        }else{
            const session: session_out = response.data;
            this.seshID = session.id;
            this.font_of_choice = session.font;
            this.question = session.question;
            this.heads = session.heads;
            console.log(JSON.stringify(this.heads));
            this.lineage_ID = session.lineage_ID;
            return true;
        }
    }
    async send_results(accept: boolean){
        let results: Result[][] = [];
        for(let i = 0; i < this.chains.length; i++){
            results.push(this.chains[i].current_run);
        }
        let output: session_in= {
            lineage_ID: this.lineage_ID,
            accept: accept,
            chains: results,
            id: this.seshID,

        }
        const request = await axios.post(SCRIVENER_URL+"/checkin", output);
    }

    next_chain() {

        if(this.current_chain < this.chains.length-1){
            this.current_chain += 1;            
        } else {
            this.current_chain = 0;
            this.iters -= 1;
        }
        
        if (this.iters == 0) {
            this.end_run();
        } else {
            this.prep_chain();
        }
    }

    prep_chain() {
        let old_params: Params = this.chains[this.current_chain].state(); //Get the last point from the current chain
        let new_params: Params = null;
        if (old_params == null) {//Should happen at the start of every run
            if(this.heads != null){//If drawing from a non-new lineage
                old_params = this.heads[this.current_chain];
                console.log("Drawn from heads: "+JSON.stringify(old_params));
            }else{ //If drawing from a new lineage TODO: Abstract this
                old_params = new Params(
                    Math.floor(Math.random() * 350),
                    Math.floor(Math.random() * 350)
                );
                new_params = new Params(
                    Math.floor(Math.random() * 350),
                    Math.floor(Math.random() * 350)
                );
            }
        } //Should only not occur if starting a new lineage, and the two Params are independent.
        if(new_params == null){
            //If you did get a state, create a proposed state by modifying the old one by the proposal distribution
            console.log("old_params: "+JSON.stringify(old_params));
            new_params = old_params.prop(this.chains[this.current_chain].prop_var);
            while (!new_params.isLegal()) {
                //If you generate out-of-bounds parameters, auto-reject and retry until you get legal ones
                //console.log("Illegal parameters! Auto-rejecting...")
                this.chains[this.current_chain].addPoint(
                    new Result(old_params.auto_copy(), new_params.auto_copy(), true, this.seshID)
                );
                new_params = old_params.prop(this.chains[this.current_chain].prop_var);
            }
        }
        this.side1 = old_params;
        this.side2 = new_params;

        this.render();
    }

    private render() {
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

    private process_input(right: boolean) {
        if(this.iters >= 0){//TODO: Check # of iters is accurate
            let new_state: Result = null;
            if (right) {
                new_state = new Result(this.side2, this.side1, false, this.seshID);
                this.inputs.push(true);
            } else {
                new_state = new Result(this.side1, this.side2, false, this.seshID);
                this.inputs.push(false);
            }
            this.chains[this.current_chain].addPoint(new_state);
            this.next_chain();
        }
    }

    private end_run() {
        let run_ok: boolean = this.checkout_eval(this.k, this.t);
        console.log("Done! Run OK: " + run_ok);
        this.send_results(run_ok)
            .then(function() {
            console.log("Successfully checked session back in!");
            });
        //TODO: Show the user out and thank them for their time.
    }

    private checkout_eval(k: number, t: number) {
        //If a user input k or more contiguous inputs that were:
        // - the same input
        // - perfectly alternating
        //OR if >t of the inputs were left, right, or alternating,
        //return false. Otherwise return true
        let alt_len: number = 0;
        let same_len: number = 0;
        let left_count = 0;
        let right_count = 0;
        let alt_count = 0;
        let last_val: boolean = null;
        for (let i: number = 0; i < this.inputs.length; i++) {
            this.inputs[i] ? right_count++ : left_count++;
            if (this.inputs[i] == last_val) {
                alt_count++;
                same_len++;
                alt_len = 0;
                if (same_len >= k) return false;
            } else {
                alt_len++;
                same_len = 0;
                last_val = !last_val;
                if (alt_len >= k) return false;
            }
        }
        if (
            t <=
            Math.max(left_count, right_count, alt_count) / this.inputs.length
        )
            return false;

        return true;
    }
}
function server_full() { //TODO: Gets called when client receives "Unavailable" from server.
    console.log("Server is busy! Unable to progress")
}

async function run_singer(){
    let main = await new Main();
    await main.prep_chain();
}

run_singer().then(r => console.log("Done!"));