import {instruction_font, NUMBER_OF_CHAINS, Params, Result, session_in, session_out,} from "./datatypes";

const axios = require("axios");

//CONSTANTS
const SCRIVENER_URL: String = "http://localhost:3000";
const ITERATIONS: number = 2; //The number of iterations PER CHAIN. Total choices = this * NUMBER_OF_CHAINS
const INPUT_STREAK_THRESHOLD: number = 20; //probability of 20 straight lefts/rights/alts ~= 1 in a million
const INPUT_SHARE_THRESHOLD: number = 0.67; //Probability of number of rights being above 54% = 1 in a million
const PROPOSAL_VARIANCE: number = 10; //For fonts, starting around .1 is a good start for most values.
const pages = [
    '<header><div class="page-header-icon undefined"><span class="icon">📜</span></div><h1 class="page-title">Instructions</h1></header><div class="page-body"><p id="4a710f91-a4d3-4a93-b0cf-ab5c6d8a3cd3" class="">In this study, we&#x27;ll be asking you to make a series of choices between fonts. You will be presented with two fonts at a time, and should choose one based on the criterion at the top of the page. You can either click on the text you prefer to make your choice, or press the &#x27;A&#x27; or &#x27;D&#x27; keys to choose left or right, respectively. Try not to agonize over each choice, we expect each choice to take between 1 and 5 seconds. At the same time, know that we will be analysing the data of your choices to ensure you are making judgements and not simply clicking randomly.</p>' +
        '<p id="e39903e7-0049-424e-8db6-91b0290c1edf" class="">You will be making a large number of choices, but we expect you to be able to complete the survey within an hour. Once you start the survey, please complete it in full. If you take more than 3 hours to complete the survey, we will not be able to use your data. When you have completed all of your choices, a screen will appear to thank you for your time.</p><p id="1583a193-a4db-43cc-bd1b-5c7662c4e017" class="">Some of the fonts may appear warped or strange. If both fonts look strange, and you don&#x27;t think either one applies to the criteria, just make your best guess as to which better aligns with the criterion. Additionally, some fonts will not show all the text. This is normal, please do not include this in your judgement. </p><p id="ce591c4e-0da5-4115-ba65-bccd3b7ab586" class="">When you click &quot;Start&quot; below, you&#x27;ll be taken to the survey interface.</p>\n  <button id="Start"> Start </button>\n            </div>',
    '<header><div class="page-header-icon undefined"><span class="icon">🙏</span></div><h1 class="page-title">Thanks!</h1></header><div class="page-body"><p id="5c46882d-7aca-4633-8ad7-fbeef8ed5a28" class="">Thank you for participating in the study. The data of your choices has been logged with our server, and we&#x27;ll be using it in our analysis.</p><p id="78085091-60a7-4ff8-bbd2-1dea57e7ae75" class="">The fonts in this study were parametrically generated from a set of 16 parameters. Your results are combined with those of other participants to form a chain of responses. We analyze that chain to discern which parameters create readable and professional fonts, and which do not.</p><p id="fd53f4a3-570f-4075-94fc-fc985139a5d8" class="">\n' +
        '</p><p id="9d15e188-2e74-4801-b989-49f4a5be85b6" class="">If you&#x27;re coming from our AMTurk HIT, use the following code in the HIT Interface:<div class="indented"><p id="7165edeb-ff16-4eec-ab18-cbfab69296e7" class="">Something is wrong!</p><p id="2503f75f-1a5c-4bc8-aae1-b9c3e5931e64" class="">\n' +
        "</p></div></p></div>",
];
let end_code: string = "f4fd1c0f48beef-6cb312dbc"

let chains: Result[][];
let lefts: Params[] = [];
let rights: Params[] = [];
let left_imgs: HTMLImageElement[] = [];
let right_imgs: HTMLImageElement[] = [];
let showing_chain: number = -1;

//HTML Elements and their associated values
let text_box: HTMLElement = document.getElementById("container");
let c1: HTMLImageElement = document.getElementById(
    "canvas_1"
) as HTMLImageElement;
let c2: HTMLImageElement = document.getElementById(
    "canvas_2"
) as HTMLImageElement;

//Values for use during run
let inputs: boolean[] = [];
let iters: number = ITERATIONS;

//Checkout prevention hyperparameters
let k: number = INPUT_STREAK_THRESHOLD;
let t: number = INPUT_SHARE_THRESHOLD;

//Info to be taken from server
let font_of_choice: instruction_font;
let seshID: String;
let lineage_ID: String;
let heads: Params[];

//PRE-RUN METHODS

async function init() {

    let consent_button = document.getElementById("consent_confirmed");
    consent_button.addEventListener("click", () => {
        load_instructions();
    });
    //Initialize Chains
    chains = [];
    for (let i = 0; i < NUMBER_OF_CHAINS; i++) {
        chains.push([]);
        lefts.push(null);
        rights.push(null);
        left_imgs.push(new Image());
        right_imgs.push(new Image());
    }

    //Add panic button
    window.addEventListener("beforeunload", panic_end);

    //Gather data from server
    let retrieved: boolean = await retrieve();
    if (retrieved) {
        console.log("Successfully retrieved session!");
        document.getElementById("criteria").innerText =
            "Which font do you think is more professional?";
        if(font_of_choice == instruction_font.Arial){
            document.getElementById("container").style.fontFamily = "Arial";
            document.getElementById("criteria").style.fontFamily = "Arial";
            document.getElementById("counter").style.fontFamily = "Arial";
        }else{
            document.getElementById("container").style.fontFamily = "Georgia";
            document.getElementById("criteria").style.fontFamily = "Georgia";
            document.getElementById("counter").style.fontFamily = "Georgia";
        }
        document.getElementById("container").removeAttribute("hidden");
        for (let i: number = 0; i < NUMBER_OF_CHAINS; i++) {
            iterate_chain(i, null, null);
        }
        showing_chain = 0;
        await render_chain(0);
    } else
    {
        server_full();
    }

}

function load_instructions() {
    console.log("Loading Instructions...");
    text_box.innerHTML = "";
    text_box.insertAdjacentHTML("afterbegin", pages[0]);
    let start_button = document.getElementById("Start");
    start_button.addEventListener("click", () => {
        load_experiment();
    });
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
        heads = fix_heads(session.heads);
        lineage_ID = session.lineage_ID;
        // console.log("Lineage: " + lineage_ID);
        // console.log(heads);
        return true;
    }
}

function fix_heads(heads) {
    if (heads) {
        let out_heads: Params[] = [];
        for (let i: number = 0; i < NUMBER_OF_CHAINS; i++) {
            out_heads.push(new Params(heads[i].values));
        }
        return out_heads;
    }
    return heads;
}

//IN-RUN METHODS

function load_experiment() {
    console.log("Forms complete! Going to experiment...");
    text_box.innerHTML = "";

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

    document.getElementById("experiment").removeAttribute("hidden");
}


function load_fonts(chain: number) {
    function format_url(p: Params) {
        let out: string = SCRIVENER_URL + "/screen/";
        for (let i: number = 0; i < p.values.length; i++) {
            out += p.values[i].toString();
            if (i < 15) out += "-";
            else out += "/";
        }
        return out;
    }
    left_imgs[chain].src = format_url(lefts[chain]);
    right_imgs[chain].src = format_url(rights[chain]);
}

function iterate_chain(chain: number, chosen: Params, rejected: Params) {
    console.log("Iterating on Chain " + chain + "...");
    if (chosen != null && rejected != null) {
        let new_state: Result = {
            author: seshID,
            auto: false,
            chosen: chosen,
            rejected: rejected,
        };
        if (chains[chain].length == 0) {
            chains[chain].push(new_state);
        } else if (
            chains[chain][chains[chain].length - 1].chosen.values == chosen.values ||
            chains[chain][chains[chain].length - 1].chosen.values == rejected.values
        ) {
            chains[chain].push(new_state);
        } else {
            console.log(
                "Something went wrong! You're trying to put a Result on the wrong chain"
            );
        }
    }
    let old_params: Params; //Get the last point from the current chain
    if (chains[chain].length == 0) {
        old_params = heads != null ? new Params(heads[chain].values) : null;
    } else {
        old_params = chains[chain][chains[chain].length - 1].chosen;
    }
    let new_params: Params;
    if (old_params == null) {
        old_params = Params.new_uniform();
        new_params = Params.new_uniform();
    } else {
        new_params = old_params.prop(PROPOSAL_VARIANCE);
        while (!new_params.isLegal()) {
            chains[chain].push({
                author: seshID,
                auto: true,
                chosen: new Params(old_params.values),
                rejected: new Params(new_params.values),
            });
            new_params = old_params.prop(PROPOSAL_VARIANCE);
        }
    }
    if (Math.random() > 0.5) {
        lefts[chain] = old_params;
        rights[chain] = new_params;
    } else {
        lefts[chain] = new_params;
        rights[chain] = old_params;
    }
    load_fonts(chain);
}

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function render_chain(chain: number) {
    document.getElementById("counter").innerText="Choices Left: "+(((iters-1) * NUMBER_OF_CHAINS) + (NUMBER_OF_CHAINS - showing_chain)).toString();
    showing_chain = -1
    console.log("Rendering chain " + chain + "...");
    c1.src = "../clear.png";
    c2.src = "../clear.png";
    while(true){
        if(left_imgs[chain].complete && right_imgs[chain].complete){
            c1.src = left_imgs[chain].src;
            c2.src = right_imgs[chain].src;
            break;
        }else await sleep(100)
    }
    await sleep(200);
    if(c1.complete && c2.complete) showing_chain = chain

}

async function process_input(right: boolean) {
    if (iters >= 0 && showing_chain >= 0) {//Assuming the experiment is in progress...
        if (right) {
            iterate_chain(
                showing_chain,
                rights[showing_chain],
                lefts[showing_chain]
            );
            inputs.push(true);
        } else {
            iterate_chain(
                showing_chain,
                lefts[showing_chain],
                rights[showing_chain]
            );
            inputs.push(false);
        }//Send the data off for the choice that was just made

        //Then figure out what the next chain is
        if (showing_chain < 0) console.log("Eek!");
        else if (showing_chain < NUMBER_OF_CHAINS - 1) {
            showing_chain += 1;
        } else {//And decrement the iteration counter if appropriate
            showing_chain = 0
            iters = iters - 1;
        }
        //If we're at or past the last iteration on the last chain, end the run.
        //Otherwise just render the next chain.
        if (iters <= 0 && showing_chain == 0) await end_run();
        else await render_chain(showing_chain);
    }
}

//POST-RUN METHODS
function panic_end() {
    end_run(true);
}

function end_run(panic: boolean = false) {
    iters = -1;
    showing_chain = -1;
    let run_ok: boolean = checkout_eval(k, t);
    console.log("Done! Run OK: " + run_ok);
    send_results(run_ok).then(function () {
        console.log("Successfully checked session back in!");
        if (!panic) {
            text_box.insertAdjacentHTML("afterbegin", pages[1]);
            document.getElementById("7165edeb-ff16-4eec-ab18-cbfab69296e7").innerText = end_code;
            document.getElementById("experiment").hidden = true;
            window.removeEventListener("beforeunload", panic_end);
        }
    });
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

async function send_results(accept: boolean) {
    let output: session_in = {
        lineage_ID: lineage_ID,
        accept: accept,
        chains: chains,
        id: seshID,
    };
    const response = await axios.post(SCRIVENER_URL + "/checkin/", output);
    console.log("A: "+response.data)
    end_code = response.data.toString();
    console.log("B: "+end_code)
}

function server_full() {
    text_box.innerText = "";
    document.getElementById("experiment").removeAttribute("hidden");
    document.getElementById("criteria").innerText =
        "We're sorry, but the server appears to be busy. Please revisit this site in an hour.";
}

init().then();
