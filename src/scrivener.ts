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

const fs = require("fs");
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
const port = 3000;

function save() {
    const dateHash = Date.now().toString(36);
    fs.writeFile(
        "/backup/" + dateHash + ".json",
        JSON.stringify(lineages),
        function (err) {
            if (err) {
                console.log(err);
            }
        }
    );
}

class Lineage {
    public id: String;
    //0 = New, 1 = Free, 2 = Busy, 3= Converged
    private status: lineage_status;
    private chains: Result[][];
    public seshID: Date;
    public instr_font: instruction_font;
    public question: question_word;

    constructor(id: number, font: number, q: number, num_chains: number = 9) {
        this.id = "Lineage " + id;
        this.chains = [];
        for (let i = 0; i < num_chains; i++) {
            let x: Result[] = [];
            this.chains.push(x);
        }
        this.instr_font = font;
        this.question = q;
        this.status = lineage_status.New;
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
            heads.push(head.chosen);
        }
        this.status = lineage_status.Busy;
        this.seshID = sesh;
        return heads;
    }

    checkin(seshID: String, accept: boolean, chains: Result[][]) {
        if (this.seshID != null && this.seshID.toString() == seshID) {
            console.log("Matched Session ID!");
            if (accept) {
                console.log("Accept confirmed!");
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
            console.log("Incorrect session ID! Lineage remains unchanged");
            return false;
        }
    }
}

let lineages: Lineage[] = [];
function init() {
    for (let i: number = 0; i < 2; i++) {
        for (let j: number = 0; j < 2; j++) {
            lineages.push(new Lineage(i * 2 + j, 0, 0, NUMBER_OF_CHAINS));
        }
    }
}

init(); //TODO: Remove this

app.get("/checkout", (req, res) => {
    let available: boolean = false;
    //if (req.params["pass"]!="regdar") res.send("Unauthenticated!");//Confirm it's coming from FontSinger with a passphrase
    console.log("Started new checkout request...");
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
        console.log("Sent data to client!");
    } else {
        res.send("Unavailable!");
    }
});

app.post("/checkin", (req, res) => {
    console.log("Received data back:");
    let success: boolean;
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
    save();
    res.send("Successfully saved data!");
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
