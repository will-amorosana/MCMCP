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
import {json, raw} from "express";


import Timeout = NodeJS.Timeout;
const fs = require("fs");
const path = require('path');
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
const port = 3000;

function save(setAsNewest: boolean = true) {
    const dateHash: String = Date.now().toString(36);
    console.log("Saving file...");
    fs.writeFileSync("./backup/" + dateHash + ".json",
        JSON.stringify(lineages, null, 4));
    if(setAsNewest){
        fs.writeFileSync("./current_backup.txt",dateHash);
    }
}

function load_scratch() {//Sets up lineages
    console.log("Loading from scratch! Maybe your file wasn't found...");
    for (let i: number = 0; i < 2; i++) {
        for (let j: number = 0; j < 2; j++) {
            lineages.push(new Lineage(i * 2 + j, i, j, NUMBER_OF_CHAINS));
        }
    }
}

async function loadLatest(){
    let latestHash: string = fs.readFileSync("./current_backup.txt");
    if(latestHash=="") load_scratch();
    else await load(latestHash);

}

async function load(hash: string, ){
    const filename: string = "./backup/"+hash+".json";
    let raw_data = JSON.parse(fs.readFileSync(filename));
    if(raw_data==null) load_scratch()
    else for(let i: number = 0; i < raw_data.length; i++){
        let new_lineage = new Lineage(raw_data[i].id, raw_data[i].instr_font, raw_data[i].question, NUMBER_OF_CHAINS);
        new_lineage.reform(raw_data[i].chains);
        lineages.push(new_lineage);
    }
}

function chain_length(chain: number = -1){
    if(chain<0){
        let sum: number = 0;
        for(let i:number = 0; i < lineages.length; i++){
            sum += average_length(i);
        }
        return sum/lineages.length;
    }else{
        return average_length(chain);
    }
}

function average_length(chain: number){
    const chains: Result[][] = lineages[chain].chains;
    let count: number = 0;
    for(let i: number = 0; i < NUMBER_OF_CHAINS; i++){
        count += chains[i].length;
    }
    return count/NUMBER_OF_CHAINS;
}

async function clear_Caches(){//Clear all saved backups, and then re-save with the current logs. Will not work if Lineages are empty.
    if(chain_length()==0) console.log("We're empty, not clearing caches for safety!");
    else{
        fs.readdir("backup", (err, files) => {
            if (err) throw err;
            for (const file of files) {
                fs.unlink(path.join("backup", file), err => {
                    if (err) throw err;
                });
            }
        });
        save();
    }
}

async function maintain(){
    const currentDate: Date = new Date();
    for(let i: number = 0; i < lineages.length; i++){//For each lineage...
        let minutes: number = 0;//If it's been more than 3 hours since it was checked out, check it back in.
        if(lineages[i].seshID) minutes = (currentDate.getTime() - lineages[i].seshID.getTime()) / 60000;
        if(minutes >180) lineages[i].checkin(lineages[i].seshID.toString(), false, null);
        save();
    }
}

async function output(){
    
}

class Lineage {
    public id: string;
    //0 = New, 1 = Free, 2 = Busy, 3= Converged
    private status: lineage_status;
    public chains: Result[][] =[];
    public seshID: Date;
    public instr_font: instruction_font;
    public question: question_word;

    constructor(id: number, font: number, q: number, num_chains: number) {
        this.id = "Lineage " + id;
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

    reform(chains: Result[][]){
        for (let i: number = 0; i < this.chains.length; i++) {
            this.chains[i] = this.chains[i].concat(chains[i]);
        }
    }
}


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
    save(true);
    res.send(success);
});

app.post("/save/", (req, res) => {
    save(true);
    res.send("Successfully saved data!");
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

let lineages: Lineage[];
let cancelValue: Timeout;
async function init() {
    lineages= [];
    await loadLatest();
    cancelValue = setInterval(maintain, 3600000);
}

init().then();
