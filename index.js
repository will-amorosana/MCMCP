import Chain from "Chain.js";

var chain_a = new Chain(100, 20);
var chain_b = new Chain(100, 20);
var chain_c = new Chain(100, 20);
var current_chain = chain_a;
function next_chain(x) {
    if (x==chain_a) return chain_b;
    else if (x==chain_b) return chain_c;
    else if (x==chain_c) return chain_a;
    else return null;
}


while(true){
    old_params = current_chain.current_params
    //TODO: Make it iterate.
}