class Params{
    x;
    y;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    get x(){
        return this.x;
    }
    get y(){
        return this.y;
    }
    isLegal(){
        if (this.x < 0 || this.x > 350) return false;
        if (this.y < 0 || this.y > 250) return false;
        return true;

    }

}

class Chain {
    prop_var = 10;
    results = [];
    constructor(prop_var) {
        this.prop_var = prop_var;
    };

    addPoint(x,y){
        this.results.push(new Params(x,y));
    }

    state(){
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
var current_chain = chain_a;

//Initialize local variables
var x1 = 0, x2 = 0, y1 = 0, y2 = 0;

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

//Add listeners to each panel
let left_click = c1.addEventListener('click', clicked_left);
let right_click = c2.addEventListener('click', clicked_right);
function next_chain(x) {
    if (x==chain_a) return chain_b;
    else if (x==chain_b) return chain_c;
    else if (x==chain_c) return chain_a;
    else return null;
}
function prop(variance) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return (Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v )) * variance;
};


function clicked_left() {
    current_chain.addPoint(x1, y1);
}

function clicked_right() {
    current_chain.addPoint(x2, y2)
}

while(true){
    let old_params = current_chain.state();
    if (old_params ==  null){
        x1 = Math.floor(Math.random() * 350);
        y1 = Math.floor(Math.random() * 350);
        x2 = Math.floor(Math.random() * 350);
        y2 = Math.floor(Math.random() * 350);
    }else{
        let new_params = new Params(old_params.x() + prop(current_chain.prop_var), old_params.y() + prop(current_chain.prop_var));
        while(!new_params.isLegal()){
            current_chain.addPoint(old_params.x(), old_params.y());
            new_params = new Params(old_params.x() + prop(current_chain.prop_var), old_params.y() + prop(current_chain.prop_var));
        }
        if(Math.random() > .5){
            const side1 = old_params;
            const side2 = new_params;
        }else{
            const side1 = new_params;
            const side2 = old_params;
        }
        //TODO: Bounds Detection
        ellipse(panel1,350,350,x1,y1);
        ellipse(panel2,350,350,x2,y2);

        Promise.any([left_click,right_click]);
    }
    //TODO: Make it iterate.
}