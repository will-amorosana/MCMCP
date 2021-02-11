import {
    instruction_font,
    lineage_status,
    NUMBER_OF_CHAINS,
    Params,
    question_word,
    Result,
    session_in,
    session_out
} from "./datatypes";

const express = require("express");
var cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json())
const port = 3000;







class Lineage {
    public id: String;
    //0 = New, 1 = Free, 2 = Busy, 3= Converged
    private status: lineage_status;
    private chains: Result[][];
    public seshID: Date;
    public instr_font: instruction_font;
    public question: question_word;

    constructor(id: number, font: number, q: number, num_chains: number = 9) {
        this.id = "Lineage "+id;
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
        return (this.status <= 1);
    }

    checkout(sesh: Date) {
        let heads: Params[] = [];
        if (this.status == lineage_status.New) {
            this.status = lineage_status.Busy;
            this.seshID = sesh;
            return null; //Handled on client side
        }
        for (let i = 0; i < this.chains.length; i++) {
            let head: Result = this.chains[i][this.chains[i].length - 1];
            heads.push(head.value());
        }
        this.status = lineage_status.Busy;
        this.seshID = sesh;
        return heads;
    }

    checkin(seshID: String, accept: boolean, chains: Result[][]) {
        if(this.seshID.toString() == seshID){
            if(accept){
                for(let i: number = 0; i < chains.length; i++){
                    this.chains[i].concat(chains[i]);
                }
            }
            this.status = lineage_status.Free;
        }else{
            console.log("Incorrect session ID! Lineage remains checked out.")
        }
    }
}
let lineages: Lineage[] = [];
function init(){
    for (let i:number = 0; i < 2; i++){
        for(let j:number = 0; j<2; j++){
            lineages.push(new Lineage((i*2)+j,0, 0, NUMBER_OF_CHAINS))
        }
    }
}


init();


app.get("/checkout", (req, res) => {
    let available: boolean = false;
    //if (req.params["pass"]!="regdar") res.send("Unauthenticated!");//Confirm it's coming from FontSinger with a passphrase
    console.log("Started new checkout request!");
    for (let i = 0; i < lineages.length; i++) {
        if (lineages[i].available()) {
            available = true;
            console.log("At least one lineage is available!")
            break;
        }
    }
    if (available) {
        let seshID = new Date();
        let choice:Lineage = null;
        while (true) {
            let i: number = Math.floor(Math.random() * (NUMBER_OF_CHAINS+1));
            console.log(i);
            if (lineages[i].available()) {
                choice = lineages[i];
                break;
            }
        }
        let heads:Params[] = choice.checkout(seshID);
        let output: session_out =
            {
                id: seshID.toString(),
                lineage_ID: choice.id,
                font: choice.instr_font,
                question: choice.question,
                heads: heads
            };
        res.json(output);
    }else{
        res.send("Unavailable!")
    }
});

app.post("/checkin", (req, res) => {
    console.log("Received data back:");
    let input: session_in = req.body;
    console.log(input);
    for(let i: number = 0; i < lineages.length; i++){
        if(lineages[i].id == input.lineage_ID){

            break;
        }
    }
    res.send(req.body);
});

app.listen(port, () => {

    console.log(`Example app listening at http://localhost:${port}`);
});
