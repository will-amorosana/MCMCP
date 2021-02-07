import { Result, Params } from "./datatypes";

const express = require("express");

const app = express();
const port = 3000;



enum lineage_status {
    New,
    Free,
    Busy,
    Converged,
}
enum instruction_font {
    OpenSans,
    PlayfairDisplay
}

enum question_word {
    professional,
    readable
}

class Lineage {
    public id: String;
    //0 = New, 1 = Free, 2 = Busy, 3= Converged
    private status: lineage_status;
    private chains: Result[][];
    private seshID: String;
    public instr_font: instruction_font;
    public question: question_word;

    constructor(font: number, q: number, num_chains: number = 9) {
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
        return (this.status== lineage_status.New || this.status == lineage_status.Free);
    }

    checkout(sesh: String) {
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

    checkin(sesh: number) {}
}
let lineages: Lineage[] = [];
function init(){
    for (let i:number = 0; i < 3; i++){
        for(let j:number = 0; j<3; j++){
            lineages.push(new Lineage(i,j,9))
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
        let seshID = new Date().toString(); //TODO: Maybe hash this??
        let choice:Lineage = null;
        while (true) {
            let i: number = Math.floor(Math.random() * 9);
            if (lineages[i].available()) {
                choice = lineages[i];
                break;
            }
        }
        let heads:Params[] = choice.checkout(seshID);
        let output = {id: seshID, font: choice.instr_font, question: choice.question, heads: heads};
        res.json(output);
    }else{
        res.send("Unavailable!")
    }
});

app.post("/checkin/:seshID", (req, res) => {
   console.log(req);

});

app.listen(port, () => {

    console.log(`Example app listening at http://localhost:${port}`);
});
