

//This is how coordinates are passed between methods. It's basically just a tuple that can check if it's beyond bounds [0,350].
class Params{
    x;
    y;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    isLegal(){
        if (this.x < 0 || this.x > 350) return false;
        if (this.y < 0 || this.y > 250) return false;
        return true;
    }
    toString(){
        return ("(X: "+this.x+", Y: "+this.y+")");
    }
}


//Chains hold their own proposal variance and an array of Params as results.
class Chain {
    prop_var = 10;
    results = [];
    constructor(prop_var) {
        this.prop_var = prop_var;
    };

    addPoint(x,y){ //Adds a new result to the end of the array
        this.results.push(new Params(x,y));
    }

    state(){ //Returns the most recent point in the result. If it's an empty array, returns null (behavior handled below)
        if(this.results.length == 0){ //If this is the first iteration, send back null
            return null;
        } else { //If not, return the tail of the chain
            return this.results[this.results.length-1];
        }
    }


}

//Initialize Chains
var chain_a = new Chain(20);
var chain_b = new Chain(10);
var chain_c = new Chain(5);

//Sleep function- not used, mostly for testing
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

//Get references for HTML elements
var c1 = document.getElementById("canvas_1");
var c2 = document.getElementById("canvas_2");
var panel1 = c1.getContext("2d");
var panel2 = c2.getContext("2d");

//Function for drawing the oval
function ellipse(context, cx, cy, rx, ry){
    context.clearRect(0, 0, cx*2, cy*2);
    context.save(); // save state
    context.beginPath();

    context.translate(cx-rx, cy-ry);
    context.scale(rx, ry);
    context.arc(1, 1, 1, 0, 2 * Math.PI, false);

    context.restore(); // restore to original state
    context.stroke();
}

function next_chain(x) {//Couldn't find a library function for this, but it just cycles the chains. Not currently in use.
    if (x==chain_a) return chain_b;
    else if (x==chain_b) return chain_c;
    else if (x==chain_c) return chain_a;
    else return null;
}

function prop(variance) { //Gaussian function. Returns a value from a Gaussian distribution with mean 0 and variance equal to the input parameter
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return (Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v )) * variance;
};

async function test_chain(chain){//Primary function. Runs one user trial of a given chain
        let old_params = chain.state();//Get the last point from the current chain
        let new_params = null;
        let side1 = null;
        let side2 = null;

        if (old_params == null) {//If it's empty (a new chain), generate uniformly random values for all parameters for both choices
            old_params = new Params(Math.floor(Math.random() * 350), Math.floor(Math.random() * 350));
            new_params = new Params(Math.floor(Math.random() * 350), Math.floor(Math.random() * 350));
        }
        else { //If you did get a state, create a proposed state by modifying the old one by the proposal distribution TODO: ABSTRACT THE VECTOR
            new_params = new Params(old_params.x + prop(chain.prop_var), old_params.y + prop(chain.prop_var));
            while (!new_params.isLegal()) { //If you generate out-of-bounds parameters, auto-reject and retry until you get legal ones
                chain.addPoint(old_params.x, old_params.y);
                new_params = new Params(old_params.x + prop(chain.prop_var), old_params.y + prop(chain.prop_var));
            }
        }
        if (Math.random() > .5) {//Randomly assign the values to each of the two sides of the screen.
            side1 = old_params;
            side2 = new_params;
        }
        else {
            side1 = new_params;
            side2 = old_params;
        }
        //Draw the ovals from the given parameters
        ellipse(panel1, 350, 350, side1.x, side1.y);
        ellipse(panel2, 350, 350, side2.x, side2.y);


        //Put listeners on the canvases
        let left_click = new Promise(function (resolve, reject) {
            c1.addEventListener('click', function (event) {
                //console.log("Clicked Left!");
                resolve('left');
            }, {once: true});
        });
        let right_click = new Promise(function (resolve, reject){
            c2.addEventListener('click', function (event) {
                //console.log("Clicked Right!");
                resolve('right');
            }, {once: true});
        });

        const promises = [left_click, right_click];
        await Promise.any(promises).then(function (result) {//When one of the two clicks comes in, add the corresponding coordinates to the chain
            if (result == 'left') {
                chain.addPoint(side1.x, side2.y);
                //console.log("Point Added From Side 1 to "+chain.name+"!");
            } else if (result == 'right') {
                chain.addPoint(side2.x, side2.y);
                //console.log("Point Added From Side 2 to "+chain.name+"!");
            }
        }, function (error) {
            console.log(error);
        });
}

(async () => { //Runs test_chain on each chain once each, then posts the results of each in the console.
    while (true) {
        await test_chain(chain_a);
        await test_chain(chain_b);
        await test_chain(chain_c);
        console.log('A: ' + chain_a.state().toString() + " ("+chain_a.results.length+" points)");
        console.log('B: ' + chain_b.state().toString() + " ("+chain_b.results.length+" points)");
        console.log('C: ' + chain_c.state().toString() + " ("+chain_c.results.length+" points)");
    }
})();
