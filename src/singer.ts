//Sleep function- not used, mostly for testing
// function sleep(ms) {
//     return new Promise((resolve) => setTimeout(resolve, ms));
// }

import {
    Result,
    Params,
    instruction_font,
    question_word,
    NUMBER_OF_CHAINS,
    session_out,
    session_in,
} from "./datatypes";
const axios = require("axios");

//CONSTANTS
const SCRIVENER_URL: String = "http://localhost:3000";
const ITERATIONS: number = 3; //The number of iterations PER CHAIN. Total choices = this * NUMBER_OF_CHAINS
const INPUT_STREAK_THRESHOLD: number = 20; //probability of 20 straight lefts/rights/alts ~= 1 in a million
const INPUT_SHARE_THRESHOLD: number = 0.9; //Probability of number of rights being above 54% = 1 in a million TODO: Revert to .55
const PROPOSAL_VARIANCE: number = 10; //For fonts, starting around .1 is a good start for most values.

let chains: Result[][];

//HTML Elements and their associated values
let c1: HTMLCanvasElement = document.getElementById(
    "canvas_1"
) as HTMLCanvasElement;
let c2: HTMLCanvasElement = document.getElementById(
    "canvas_2"
) as HTMLCanvasElement;
let panel1: CanvasRenderingContext2D = c1.getContext("2d");
let panel2: CanvasRenderingContext2D = c2.getContext("2d");
let side1: Params = null;
let side2: Params = null;

//Values for use during run
let current_chain: number = 0;
let inputs: boolean[] = [];
let iters: number = ITERATIONS;

//Checkout prevention hyperparameters
let k: number = INPUT_STREAK_THRESHOLD;
let t: number = INPUT_SHARE_THRESHOLD;

//Info to be taken from server
let font_of_choice: instruction_font;
let question: question_word;
let seshID: String;
let lineage_ID: String;
let heads: Params[];

async function init() {
    //Initialize Chains
    chains = [];
    for (let i = 0; i < NUMBER_OF_CHAINS; i++) {
        chains.push([]);
    }

    //Gather data from server
    retrieve().then(function (ok) {
        if (ok) console.log("Successfully retrieved session!");
        else server_full();
    });

    c1.addEventListener("click", async () => {
        await process_input(false);
    });
    c2.addEventListener("click", async () => {
        await process_input(true);
    });

    document.addEventListener("keydown", async (e) => {
        if (e.code == "KeyA") {
            await process_input(false);
        } else if (e.code == "KeyD") {
            await process_input(true);
        }
    });
    await prep_chain();
}

async function retrieve() {
    //Checkout stuff
    const response = await axios.get(SCRIVENER_URL + "/checkout/");
    if (response.data == "Unavailable!") {
        return false;
    } else {
        const session: session_out = response.data;
        seshID = session.id;
        font_of_choice = session.font;
        question = session.question;
        heads = session.heads;
        lineage_ID = session.lineage_ID;
        console.log("Lineage: "+ lineage_ID);
        console.log("Heads: "+JSON.stringify(heads));
        return true;
    }
}
async function send_results(accept: boolean) {
    let output: session_in = {
        lineage_ID: lineage_ID,
        accept: accept,
        chains: chains,
        id: seshID,
    };
    const response = await axios.post(SCRIVENER_URL + "/checkin", output);
    console.log(response.status);
}

async function next_chain() {
    if (current_chain < chains.length - 1) {
        current_chain += 1;
    } else {
        current_chain = 0;
        iters -= 1;
    }

    if (iters == 0) {
        await end_run();
    } else {
        await prep_chain();
    }
}

function state() {
    if (chains[current_chain].length == 0) {
        //If this is the first iteration of the current run, check the heads from  last session. Should return null otherwise.
        console.log(heads);
        return (heads!=null ? heads[current_chain].auto_copy() : null);
    } else {
        //If it's not the first step in the run, return the head of the current run
        return chains[current_chain][chains[current_chain].length - 1].chosen;
    }
}

async function prep_chain() {
    let old_params: Params = state(); //Get the last point from the current chain
    let new_params: Params;
    if (old_params == null) {
        old_params = Params.new_uniform();
        new_params = Params.new_uniform();
    }else {
        //If you did get a state, create a proposed state by modifying the old one by the proposal distribution
        console.log("old_params: " + JSON.stringify(old_params));
        new_params = old_params.prop(PROPOSAL_VARIANCE);
        while (!new_params.isLegal()) {
            chains[current_chain].push(
                new Result(
                    old_params.auto_copy(),
                    new_params.auto_copy(),
                    true,
                    seshID
                )
            );
            new_params = old_params.prop(PROPOSAL_VARIANCE);
        }
    }
    side1 = old_params;
    side2 = new_params;

    await render();
}

async function render() {
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
        let temp: Params = side1;
        side1 = side2;
        side2 = temp;
    }
    ellipse(panel1, 350, 350, side1.x, side1.y);
    ellipse(panel2, 350, 350, side2.x, side2.y);
}

async function process_input(right: boolean) {
    if (iters >= 0) {
        let new_state: Result;
        if (right) {
            new_state = new Result(side2, side1, false, seshID);
            inputs.push(true);
        } else {
            new_state = new Result(side1, side2, false, seshID);
            inputs.push(false);
        }
        chains[current_chain].push(new_state);
        await next_chain();
    }
}

function end_run() {
    let run_ok: boolean = checkout_eval(k, t);
    console.log("Done! Run OK: " + run_ok);
    send_results(run_ok).then(function () {
        console.log("Successfully checked session back in!");
    });
    //TODO: Show the user out and thank them for their time.
}

function checkout_eval(k: number, t: number) {
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
    for (let i: number = 0; i < inputs.length; i++) {
        inputs[i] ? right_count++ : left_count++;
        if (inputs[i] == last_val) {
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
    return t > Math.max(left_count, right_count, alt_count) / inputs.length;
}

function server_full() {
    console.log("Server is busy! Unable to progress");
}

async function run_singer() {
    await init();
}

run_singer().then();
