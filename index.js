//Sleep function- not used, mostly for testing
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

//This is how coordinates are passed between methods. It's basically just a tuple that can check if it's beyond bounds [0,350].
const ParamTypes = Object.freeze({"USER_DEFINED":1, "EMPTY":2, "AUTO_REJECT":3})

class Params {
    x;
    y;
    param_type = ParamTypes.USER_DEFINED;

    constructor(x, y, type) {
        if (type === undefined || type === ParamTypes.USER_DEFINED) {
            this.x = x;
            this.y = y;
            this.param_type = ParamTypes.USER_DEFINED;
        } else {
            this.x = -1;
            this.y = -1;
            this.param_type = type;
        }
    }

    auto_copy(){
        let copy = JSON.parse(JSON.stringify(this));
        copy.param_type = ParamTypes.AUTO_REJECT
        return copy;
    }


    prop(variance){
        const x = this.x + this.box_mueller(variance);
        const y = this.y + this.box_mueller(variance);
        return new Params(x, y, ParamTypes.USER_DEFINED);
    }

    box_mueller(variance) {
        let u = 0, v = 0;
        while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
        while(v === 0) v = Math.random();
        return (Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v )) * variance;
    }

    isLegal() {
        if (this.x < 0 || this.x > 350) return false;
        if (this.y < 0 || this.y > 350) return false;
        return true;
    }
}


//Chains hold their own proposal variance and an array of Params as results.
//Chains hold their own proposal variance, their previous results, and their current run.
class Chain {
    prop_var = 10;
    current_run = [];
    results = [];
    old_head = new Params(-1, -1, ParamTypes.EMPTY);
    constructor(prop_var) {
        this.prop_var = prop_var;
    };

    addPoint(x){ //Adds a new result to the end of the array
            this.current_run.push(x);
    }



    state(){ //Returns the most recent point in the current run. If it's an empty array, returns null (behavior handled below)
        if(this.current_run.length == 0){ //If this is the first iteration of the current run, check for previous runs
            if(this.old_head.param_type != ParamTypes.EMPTY){
                return this.old_head; //If there is one, forward its last point.
            }else return null; //Otherwise tell it to scratch it.
        } else { //If it's not the first step in the run, return the head of the current run
            return this.current_run[this.current_run.length-1];
        }
    }

    update(ok){
        if(ok) { //If it's all good, append the results and change the old_head.
            this.old_head = this.current_run[this.current_run.length - 1];
            this.results.push(this.current_run);
            this.current_run = [];
        }else{ //If the check-out protection comes up bogus, just clear it and move on
            this.current_run = [];
        }
    }
}


class Main{
    chain_a; chain_b; chain_c;
    c1; c2; panel1; panel2;
    inputs = [];



    constructor(){

        //Initialize Chains
        this.chain_a = new Chain(20);
        this.chain_b = new Chain(10);
        this.chain_c = new Chain(5);


        //Get references for HTML elements
        this.c1 = document.getElementById("canvas_1");
        this.c2 = document.getElementById("canvas_2");
        this.panel1 = this.c1.getContext("2d");
        this.panel2 = this.c2.getContext("2d");
    }
    left_click = new Promise(function (resolve, reject) {
        this.c1.addEventListener('click', function (event) {
            //console.log("Clicked Left!");
            resolve('left');
        }, {once:true});
    });
    right_click = new Promise(function (resolve, reject){
        this.c2.addEventListener('click', function (event) {
            //console.log("Clicked Right!");
            resolve('right');
        }, {once:true});
    });

    ellipse(context, cx, cy, rx, ry){
        context.clearRect(0, 0, cx*2, cy*2);
        context.save(); // save state
        context.beginPath();

        context.translate(cx-rx, cy-ry);
        context.scale(rx, ry);
        context.arc(1, 1, 1, 0, 2 * Math.PI, false);

        context.restore(); // restore to original state
        context.stroke();
    }
    //
    // next_chain(x) {
    //     if (x==this.chain_a) return this.chain_b;
    //     else if (x==this.chain_b) return this.chain_c;
    //     else if (x==this.chain_c) return this.chain_a;
    //     else return null;
    // }
    async test_chain(chain){

        let old_params = chain.state();//Get the last point from the current chain
        let new_params = null;
        let side1 = null;
        let side2 = null;
        if (old_params == null) {//If it's empty (a new chain), generate uniformly random values for all parameters for both choices
            old_params = new Params(Math.floor(Math.random() * 350), Math.floor(Math.random() * 350));
            new_params = new Params(Math.floor(Math.random() * 350), Math.floor(Math.random() * 350));
        }
        else { //If you did get a state, create a proposed state by modifying the old one by the proposal distribution TODO: ABSTRACT THE VECTOR
            new_params = old_params.prop(chain.prop_var);
            while (!new_params.isLegal()) { //If you generate out-of-bounds parameters, auto-reject and retry until you get legal ones
                //console.log("Illegal parameters! Auto-rejecting...")
                chain.addPoint(old_params.auto_copy());
                new_params = old_params.prop(chain.prop_var);
            }
        }
        if (Math.random() > .5) {
            side1 = old_params;
            side2 = new_params;
        }
        else {
            side1 = new_params;
            side2 = old_params;
        }
        this.ellipse(this.panel1, 350, 350, side1.x, side1.y);
        this.ellipse(this.panel2, 350, 350, side2.x, side2.y);

        const promises = [this.left_click, this.right_click];

        const result = await Promise.allSettled(promises);
        if (result == 'left') {
            chain.addPoint(side1);
            //console.log("Point Added From Side 1 to "+chain.name+"!");
        } else if (result == 'right') {
            chain.addPoint(side2);
            //console.log("Point Added From Side 2 to "+chain.name+"!");
        }
    }

    async new_run(id, iters, test_checkout){
        for(let i = 0; i < iters; i++){
            await this.test_chain(this.chain_a);
            await this.test_chain(this.chain_b);
            await this.test_chain(this.chain_c);
            console.log("Run #"+ id + " has completed iteration #"+(i+1));
        }
    }
}


(async () => {
    let main = new Main();
    await main.new_run(217, 10, true);
})();