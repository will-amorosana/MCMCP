import {
    instruction_font,
    lineage_status,
    NUMBER_OF_CHAINS,
    Params,
    Result,
    session_in,
    session_out,
} from "./datatypes";
import Timeout = NodeJS.Timeout;
const { chromium } = require("playwright");
const fs = require("fs-extra");
const path = require("path");
const express = require("express");
const cors = require("cors");
const app = express();
var prompt = require('prompt');
app.use(cors());
app.use(express.json());
const port = 3000;


//Chekhhov Constants and Functions
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
const otf_downloadSelector =
    "#menu > div > fieldset > div:nth-child(4) > div > a:nth-child(1)";
const param_names: string[] = [
    "param-unit_width",
    "param-pen_width",
    "param-cap_height",
    "param-bar_height",
    "param-ascender_height",
    "param-descender_height",
    "param-x_height",
    "param-horizontal_increase",
    "param-vertical_increase",
    "param-contrast",
    "param-superness",
    "param-slant",
    "param-aperture",
    "param-corner",
    "param-overshoot",
    "param-taper",
];
let browser;
const test_text: string =
    "Fix problem quickly with galvanized jets. Pack my red box with five dozen quality jugs. " +
    "Few black taxis drive up major roads on quiet hazy nights.  By Jove, my quick study of lexicography won a prize. " +
    "Grumpy wizards make a toxic brew for the jovial queen. Waxy and quivering, jocks fumble the pizza. Sphinx of black quartz, judge my vow.";
//let default_test: string = "localhost:1999/screen/60-90-60-50-40-12-30-0-0-10-65-50-80-70-14-60/"
const min_values = [
    0.75,
    0.15,
    0.75,
    0.31,
    0.8,
    0.25,
    0.5,
    0,
    0,
    1,
    0.6,
    -0.2,
    0,
    0,
    0,
    0,
];
const max_values = [
    2,
    0.99,
    1,
    0.75,
    1.15,
    0.65,
    0.8,
    0.75,
    0.75,
    2,
    1,
    0.2,
    0.75,
    1.5,
    0.8,
    1,
];

let hashCode = (s) =>
    s.split("").reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
    }, 0);
let theBoys: ScreenRipper[] = [];

function format_values(params: string[]) {
    let input = Object.values(params).slice(1);
    let output: number[] = [];
    for (let i: number = 0; i < input.length; i++) {
        let out =
            (parseInt(input[i]) / 100) * (max_values[i] - min_values[i]) +
            min_values[i];
        output.push(Math.round((out + Number.EPSILON) * 100) / 100); //Round each parameter to 2 decimal places
    }
    return output;
}

class ScreenRipper {
    busy = true;
    preview_box;
    id: number;
    page;

    constructor(id: number) {
        this.id = id;
        this.init().then();
    }

    async init() {
        this.page = await browser.newPage({acceptDownloads: true});
        await this.page.goto("https://www.metaflop.com/modulator"); //Go to Metaflop
        await this.page.waitForLoadState("networkidle");
        await this.page.click(
            "#parameter-panel > div > div > div:nth-child(2) > div > a.parameter-panel-mode-toggle.adjusters"
        ); //Nerd mode
        await this.page.click("#param-text", {clickCount: 3}); //Disable glyph/chart
        await this.page.keyboard.press("Backspace");
        await this.page.fill("#param-text", test_text);
        await this.page.click("#preview-typewriter > div > div.font-size > div");
        await this.page.click(
            "#preview-typewriter > div > div.font-size > ul > li:nth-child(2) > a"
        );
        await sleep(1000);
        console.log("Instance " + this.id + " set up successfully!");
        this.preview_box = await this.page.$(
            `#preview-typewriter > div > div.preview-text-wrapper`
        );
        this.busy = false;
    }

    async set_params(params: number[]) {
        this.busy = true;
        if (params.length != 16) {
            console.log("params must be 16 values long!");
            return null;
        }
        for (let i = 0; i < 16; i++) {
            await this.page.fill("#" + param_names[i], params[i].toString());
        }
    }

    async download(filename: string) {
        const [download] = await Promise.all([
            this.page.waitForEvent("download"),
            this.page.click(otf_downloadSelector),
        ]);
        await download.saveAs(filename + ".otf");
        this.busy = false;
        // await console.log("Download complete!")
    }

    async screen(filename: string) {
        // console.log("Screenshotting...");
        await this.page.hover("#parameter-panel > div > div > div:nth-child(2) > div > a.parameter-panel-mode-toggle.adjusters")
        await sleep(3000);
        await this.preview_box.screenshot({ path: filename + ".png" });
        await sleep(100);
        this.busy = false;
    }


}



//I/O Functions
let converter = require("json-2-csv");

function save(setAsNewest: boolean = true) {
    const dateHash: String = Date.now().toString(36);
    console.log("Saving file...");
    fs.writeFileSync(
        "./backup/" + dateHash + ".json",
        JSON.stringify(lineages, null, 4)
    );
    if (setAsNewest) {
        fs.writeFileSync("./current_backup.txt", dateHash);
    }
}

function load_scratch() {
    //Sets up lineages
    console.log("Loading from scratch! Maybe your file wasn't found...");
    for (let i: number = 0; i < 2; i++) {
        for (let j: number = 0; j < 2; j++) {
            lineages.push(
                new Lineage(
                    i * 2 + j,
                    i,
                    j,
                    NUMBER_OF_CHAINS,
                    lineage_status.New
                )
            );
        }
    }
}

async function loadLatest() {
    let latestHash: string = "";
    try {
        latestHash = fs.readFileSync("./current_backup.txt");
    } catch (e) {
        await load_scratch();
    }
    await load(latestHash);
}

async function load(hash: string) {
    if (hash == "") return;
    const filename: string = "./backup/" + hash + ".json";
    if (fs.existsSync(filename)) {
        let raw_data = JSON.parse(fs.readFileSync(filename));
        lineages = [];
        for (let i: number = 0; i < raw_data.length; i++) {
            let new_lineage = new Lineage(
                raw_data[i].id.slice(-1),
                raw_data[i].instr_font,
                NUMBER_OF_CHAINS,
                raw_data[i].status
            );
            new_lineage.chains = reform_chains(raw_data[i].chains);
            lineages.push(new_lineage);
        }
    } else {
        load_scratch();
    }
}

async function output() {
    const filePath: String = "./output/" + Date.now().toString(36);
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath);
        for (let i: number = 0; i < lineages.length; i++) {
            fs.mkdirSync(filePath + "/" + i.toString());
            for (let j: number = 0; j < NUMBER_OF_CHAINS; j++) {
                try {
                    let csvToSave: String = "data:text/csv;charset=utf-8,";
                    csvToSave = await converter.json2csvAsync(
                        lineages[i].chains[j],
                        { expandArrayObjects: true, unwindArrays: true }
                    );
                    fs.writeFileSync(
                        filePath +
                            "/" +
                            i.toString() +
                            "/" +
                            j.toString() +
                            ".csv",
                        csvToSave
                    );
                } catch (err) {
                    console.log(err);
                }
            }
        }
        console.log("Finished exporting to " + filePath);
    } else {
        return "Output of that name already exists!";
    }
}

async function clear_caches() {
    fs.emptyDirSync('fonts')
    if(lineage_length(lineages[0].chains) > 0){
        fs.emptyDirSync('backup')
        save();
    }
}


//Functions for Doing Your Shit

class Lineage {
    public id: string;
    //0 = New, 1 = Free, 2 = Busy, 3= Converged
    private status: lineage_status;
    public chains: Result[][] = [];
    public seshID: Date;
    public instr_font: instruction_font;

    constructor(
        id: number,
        font: number,
        q: number,
        num_chains: number,
        status: lineage_status = lineage_status.New
    ) {
        this.id = "Lineage " + id;
        for (let i = 0; i < num_chains; i++) {
            let x: Result[] = [];
            this.chains.push(x);
        }
        this.instr_font = font;
        this.status = status;
    }

    available() {
        return this.status <= 1;
    }

    checkout(sesh: Date) {
        let heads: Params[] = [];
        if (this.status == lineage_status.New || this.chains[0].length == 0) {
            console.log(
                "New/empty lineage- telling client to generate new parameters..."
            );
            this.status = lineage_status.Busy;
            this.seshID = sesh;
            return null; //Handled on client side
        }
        for (let i = 0; i < this.chains.length; i++) {
            let head: Result = this.chains[i][this.chains[i].length - 1];
            heads.push(new Params(head.chosen.values));
        }
        this.status = lineage_status.Busy;
        this.seshID = sesh;
        return heads;
    }

    checkin(seshID: String, accept: boolean, chains: Result[][]) {
        if (this.seshID != null && this.seshID.toString() == seshID) {
            if (accept) {
                console.log(this.id + " checked back in!");
                for (let i: number = 0; i < this.chains.length; i++) {
                    this.chains[i] = this.chains[i].concat(chains[i]);
                }
            } else {
                console.log("Rejected- user was 'checked out'.");
            }
            this.status = lineage_status.Free;
            this.seshID = null;
            return true;
        } else {
            console.log("Session ID did not match.");
            return false;
        }
    }

    end() {
        this.status = lineage_status.Converged;
        this.seshID = null;
    }

    free_up() {
        this.status = lineage_status.Free;
        this.seshID = null;
    }
}

function reform_chains(chains: Result[][]) {
    let out_chains: Result[][] = [];
    for (let i: number = 0; i < NUMBER_OF_CHAINS; i++) {
        let new_chain: Result[] = [];
        chains[i].forEach((result) => {
            const new_Res: Result = {
                author: result.author,
                auto: result.auto,
                chosen: new Params(result.chosen.values),
                rejected: new Params(result.rejected.values),
            };
            new_chain.push(new_Res);
        });
        out_chains.push(new_chain);
    }
    return out_chains;
}

function lineage_length(chains: Result[][]) {
    let count: number = 0;
    for (let i: number = 0; i < NUMBER_OF_CHAINS; i++) {
        count += chains[i].length;
    }
    return count / NUMBER_OF_CHAINS;
}

function latter_half(chains: Result[][]) {
    //Returns the second half of the input Chains, rounded up (middle element included).
    let new_chains: Result[][] = [];
    for (let i = 0; i < chains.length; i++) {
        let half_len = Math.floor(chains[i].length / 2);
        new_chains.push(chains[i].splice(-half_len));
    }
    return new_chains;
}

function converged(in_chains: Result[][]) {
    let chains: Result[][];
    if (lineage_length(in_chains) < 10) return 0;
    else chains = latter_half(in_chains);
    //Returns 0 if unconverged (>1.2 for at least one param, 1 if partially converged(<1.2 for all, >1.1 for some), or 2 if fully converged (<1.1 for all)
    const m: number = NUMBER_OF_CHAINS; //The number of chains
    const n: number = lineage_length(chains); //The (average) chain length, N
    const p: number = 2; //number of parameters
    let uni_psrfs: number[] = []; //The effective output

    for (let j = 0; j < p; j++) {
        //console.log("For each parameter...")
        let chain_avgs: number[] = []; //Track the mean value
        let chain_stdevs: number[] = []; //and std deviation of each chain.
        let total_sum: number = 0;
        let total_samples: number = 0;
        for (let i = 0; i < chains.length; i++) {
            //For each chain,
            let chain_sum: number = 0;
            for (let k: number = 0; k < chains[i].length; k++) {
                //First, find the mean
                chain_sum += chains[i][k].chosen.values[j];
            }
            total_sum += chain_sum;
            total_samples += chains[i].length;
            chain_avgs.push(chain_sum / chains[i].length);
            chain_sum = 0;
            for (let k: number = 0; k < chains[i].length; k++) {
                //Then, once we have that, find the std dev
                chain_sum += Math.pow(
                    chains[i][k].chosen.values[j] - chain_avgs[i],
                    2
                );
            }
            chain_stdevs.push(Math.sqrt(chain_sum / chains[i].length));
        }
        if (chain_avgs.length != m || chain_stdevs.length != chain_avgs.length)
            console.log("Your math is off, genius!");
        let total_mean = total_sum / total_samples; //So we have all our base values
        let b: number = 0; //Calculating between-chain variance B
        for (let i = 0; i < m; i++) {
            b += Math.pow(chain_avgs[i] - total_mean, 2);
        }
        b = b * (n / (m - 1));
        let w: number = chain_stdevs.reduce((a, b) => a + b, 0) / m; //Calculating within-chain variance W
        let v_hat: number = ((n - 1) / n) * w + ((m + 1) / (m * n)) * b;
        uni_psrfs.push(v_hat / w);
    }

    console.log("PSRF values for each parameter: " + uni_psrfs.toString());
    let perfect: boolean = true;
    for (let i = 0; i < p; i++) {
        if (uni_psrfs[i] >= 1.2) return 0;
        else if (uni_psrfs[i] >= 1.1) perfect = false;
    }
    return perfect ? 2 : 1;
}

async function maintain() {
    const currentDate: number = new Date().getTime();
    for (let i: number = 0; i < lineages.length; i++) {
        //For each lineage...
        //console.log("Maintaining Lineage "+i+"...")

        //If it's been more than 3 hours since it was checked out, check it back in.
        if (lineages[i].seshID) {
            let minutes: number = 0;
            minutes = (currentDate - lineages[i].seshID.getTime()) / 60000;
            if (minutes > 180) {
                console.log("Lineage " + i + " timed out!");
                lineages[i].free_up();
            }
        }

        if (converged(lineages[i].chains)) {
            console.log("Terminating Lineage " + i + "!");
            lineages[i].end();
        }
    }
    await save();
}
//Routing via Express

app.get("/checkout", (req, res) => {
    let seshID = new Date();
    let choice: Lineage = null;
    for (let i: number = 0; i < lineages.length; i++) {
        //Now should always pref lower-valued lineages. So 0 should always be the priority
        if (lineages[i].available()) {
            choice = lineages[i];
            break;
        }
    }
    if (choice) {
        let heads: Params[] = choice.checkout(seshID);
        console.log("Checking out from " + choice.id + "...");
        let output: session_out = {
            id: seshID.toString(),
            lineage_ID: choice.id,
            font: choice.instr_font,
            heads: heads,
        };
        res.json(output);
    } else {
        res.send("Unavailable!");
    }
});

app.post("/checkin", (req, res) => {
    //console.log("Received data back:");
    let success: boolean;
    //console.log(JSON.stringify(req.body, null, 2));
    let input: session_in = req.body;
    for (let i: number = 0; i < lineages.length; i++) {
        if (lineages[i].id == input.lineage_ID) {
            success = lineages[i].checkin(
                input.id,
                input.accept,
                reform_chains(input.chains)
            );
            break;
        }
    }
    res.send(success);
});

app.get(
    "/screen/:a-:b-:c-:d-:e-:f-:g-:h-:i-:j-:k-:l-:m-:n-:o-:p",
    async (req, res) => {
        let params = format_values(req.params);
        let filename: string = `fonts/font` + hashCode(params.toString()); //Generate a unique hash filename for that font
        try {
            if (fs.existsSync(filename + ".png")) {
                //Checks if font already exists before checking for a new one
                // console.log("File " + filename + " already exists! Forwarding...");
                await res.sendFile(
                    path.join(__dirname, "../", filename + ".png")
                );
            } else {
                let ripper: ScreenRipper = null;
                do{
                    for(let i: number = 0; i < 6; i++){
                        if(!theBoys[i].busy){
                            ripper = theBoys[i]
                            break;
                        }
                    }
                    if(!ripper) await sleep(1000);
                }while(!ripper);
                console.log("New request is being served!");
                await ripper.set_params(params);
                await ripper.screen(filename);
                await res.sendFile(
                    path.join(__dirname, "../", filename + ".png")
                );
                // console.log("Sent" + filename + "!");
            }
        } catch (err) {
            console.error(err);
        }


    });



//TODO: Stuff that should be CLI
//Force save, Log output, clear font and backup caches

app.post("/save/", (req, res) => {
    save(true);
    res.send("Successfully saved data!");
});

app.post("/output/", () => {
    output().then();
});

//Initialization
let lineages: Lineage[];
let cancelValue: Timeout;


async function init() {
    browser = await chromium.launch({});
    for(let i: number = 0; i < 6; i++){
        theBoys.push(new ScreenRipper(i));
    }
    lineages = [];
    await loadLatest();
    let minutes = 15;
    cancelValue = setInterval(await maintain, minutes * 60000);
    app.listen(port, () => {
        console.log(`Scrivener is now listening at http://localhost:${port}`);
    });
    prompt.start();
    await sleep(10000);
    while(true){
        let command: String = (await prompt.get([{name: 'cmd', description: ">>"}])).cmd
        if(command == "close"){
            await maintain();
            console.log("Shutting down...");
            break;
        }else if(command == "save"){
            await save();
        }else if(command == "output"){
            await output();
        }else if(command == "clear"){
            await clear_caches();
        }
    await sleep(1000);
    }
    process.exit();
}

init().then();
