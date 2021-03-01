import {
    instruction_font,
    lineage_status,
    NUMBER_OF_CHAINS,
    Params,
    question_word,
    Result,
    session_in,
    session_out,
} from "./datatypes";
import Timeout = NodeJS.Timeout;
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
const port = 3000;

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
            lineages.push(new Lineage(i * 2 + j, i, j, NUMBER_OF_CHAINS));
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
                raw_data[i].question,
                NUMBER_OF_CHAINS,
                raw_data[i].status
            );
            new_lineage.reform(raw_data[i].chains);
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

//Functions for Doing Your Shit

class Lineage {
    public id: string;
    //0 = New, 1 = Free, 2 = Busy, 3= Converged
    private status: lineage_status;
    public chains: Result[][] = [];
    public seshID: Date;
    public instr_font: instruction_font;
    public question: question_word;

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
        this.question = q;
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
            heads.push(Params.reform(head.chosen));
        }
        this.status = lineage_status.Busy;
        this.seshID = sesh;
        console.log(heads);
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

    reform(chains: Result[][]) {
        this.chains = [];
        for (let i: number = 0; i < NUMBER_OF_CHAINS; i++) {
            let new_chain: Result[] = [];
            chains[i].forEach((result) => {
                const new_Res: Result = {
                    author: result.author,
                    auto: result.auto,
                    chosen: Params.reform(result.chosen),
                    rejected: Params.reform(result.rejected),
                };
                new_chain.push(new_Res);
            });
            this.chains.push(new_chain);
        }
    }

    end() {
        this.status = lineage_status.Converged;
        this.seshID = null;
    }
}

function lineage_length(chains: Result[][]) {
    let count: number = 0;
    for (let i: number = 0; i < NUMBER_OF_CHAINS; i++) {
        count += chains[i].length;
    }
    return count / NUMBER_OF_CHAINS;
}

function converged(chains: Result[][]) {
    //Returns 0 if unconverged (>1.2 for at least one param, 1 if partially converged(<1.2 for all, >1.1 for some), or 2 if fully converged (<1.1 for all)
    let m: number = NUMBER_OF_CHAINS; //The number of chains
    let n: number = lineage_length(chains); //The (average) chain length, N
    let p: number = 2; //number of parameters
    let uni_psrfs: number[] = []; //The effective output

    for (let j = 0; j < p; j++) {
        //For each parameter,
        let chain_avgs: number[] = []; //Track the mean value
        let chain_stdevs: number[] = []; //and std deviation of each chain.
        let total_sum: number = 0;
        let total_samples: number = 0;
        for (let i = 0; i < chains.length; i++) {
            //For each chain,
            let chain_sum: number = 0;
            for (let k: number = 0; k < chains[i].length; k++) {
                //First, find the mean
                chain_sum += chains[i][k].chosen.out()[j];
            }
            total_sum += chain_sum;
            total_samples += chains[i].length;
            chain_avgs.push(chain_sum / chains[i].length);
            chain_sum = 0;
            for (let k: number = 0; k < chains[i].length; k++) {
                //Then, once we have that, find the std dev
                chain_sum += Math.pow(
                    chains[i][k].chosen.out()[j] - chain_avgs[i],
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
    const currentDate: Date = new Date();
    for (let i: number = 0; i < lineages.length; i++) {
        //For each lineage...

        let minutes: number = 0; //If it's been more than 3 hours since it was checked out, check it back in.
        if (lineages[i].seshID)
            minutes =
                (currentDate.getTime() - lineages[i].seshID.getTime()) / 60000;
        if (minutes > 180)
            lineages[i].checkin(lineages[i].seshID.toString(), false, null);

        if (converged(lineages[i].chains)) {
            lineages[i].end();
        }
    }
    save();
}

async function clear_Caches() {
    //Clear all saved backups, and then re-save with the current logs. Will not work if Lineages are empty.
    if (lineage_length(lineages[0].chains) == 0)
        console.log("We're empty, not clearing caches for safety!");
    else {
        fs.readdir("backup", (err, files) => {
            if (err) throw err;
            for (const file of files) {
                fs.unlink(path.join("backup", file), (err) => {
                    if (err) throw err;
                });
            }
        });
        save();
    }
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
            question: choice.question,
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
    //console.log(JSON.stringify(input.chains, null, 2));
    for (let i: number = 0; i < lineages.length; i++) {
        if (lineages[i].id == input.lineage_ID) {
            success = lineages[i].checkin(input.id, input.accept, input.chains);
            break;
        }
    }
    res.send(success);
});

app.listen(port, () => {
    console.log(`Scrivener is now listening at http://localhost:${port}`);
});

//TODO: Stuff that should be CLI

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
    lineages = [];
    await loadLatest();
    let minutes = 10;
    cancelValue = setInterval(await maintain, minutes * 60000);
}

init().then();
