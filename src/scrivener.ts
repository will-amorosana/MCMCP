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

//Output setup
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
    try{
        latestHash = fs.readFileSync("./current_backup.txt")
    }catch(e){
        await load_scratch();
    }
    await load(latestHash);
}

async function load(hash: string) {
    if(hash=="")return;
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

function chain_length(chain: number = -1) {
    if (chain < 0) {
        let sum: number = 0;
        for (let i: number = 0; i < lineages.length; i++) {
            sum += average_length(i);
        }
        return sum / lineages.length;
    } else {
        return average_length(chain);
    }
}

function average_length(chain: number) {
    const chains: Result[][] = lineages[chain].chains;
    let count: number = 0;
    for (let i: number = 0; i < NUMBER_OF_CHAINS; i++) {
        count += chains[i].length;
    }
    return count / NUMBER_OF_CHAINS;
}

async function clear_Caches() {
    //Clear all saved backups, and then re-save with the current logs. Will not work if Lineages are empty.
    if (chain_length() == 0)
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
    }
    save();
}

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
}

app.get("/checkout", (req, res) => {
    let available: boolean = false;
    //if (req.params["pass"]!="regdar") res.send("Unauthenticated!");//Confirm it's coming from FontSinger with a passphrase
    for (let i = 0; i < lineages.length; i++) {
        if (lineages[i].available()) {
            available = true;
            //console.log("At least one lineage is available!")
            break;
        }
    }
    if (available) {
        let seshID = new Date();
        let choice: Lineage = null;
        while (true) {
            let i: number = Math.floor(Math.random() * (NUMBER_OF_CHAINS + 1));
            if (lineages[i].available()) {
                choice = lineages[i];
                break;
            }
        }
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
        console.log("Done!");
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

app.post("/save/", (req, res) => {
    save(true);
    res.send("Successfully saved data!");
});

app.post("/output/", () => {
    output().then();
});

app.listen(port, () => {
    console.log(`Scrivener is now listening at http://localhost:${port}`);
});

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

let lineages: Lineage[];
let cancelValue: Timeout;
async function init() {
    lineages = [];
    await loadLatest();
    let minutes = 10;
    cancelValue = setInterval(maintain, minutes * 60000);
}

init().then();
