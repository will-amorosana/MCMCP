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

class Coords{
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

}

class Chain {
    c1 = document.getElementById("canvas_1");
    c2 = document.getElementById("canvas_2");
    panel1 = this.c1.getContext("2d");
    panel2 = this.c2.getContext("2d");
    len = 100;
    prop_var = 10;
    results = [];
    constructor(len, prop_var) {
        this.len = len;
        this.prop_var = prop_var;
    };
    prop(variance) {
        let u = 0, v = 0;
        while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
        while(v === 0) v = Math.random();
        return (Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v )) * variance;
    };
    state(){
        if(this.results.length == 0){ //If this is the first iteration, send back null so the
            return null;
        } else { //If not, take the tail of the chain and mutate it by the proposal distribution
            var x = this.results[this.results.length-1].x();
            var y = this.results[this.results.length-1].y();
            return new Coords(x,y);
        }
    }



    test(context_1, context_2){//Run a single MCMCP iteration
        if(this.results.length == 0){ //If this is the first iteration, randomize both ovals
            var x = Math.floor(Math.random() * 350);
            var y = Math.floor(Math.random() * 350);
            var x2 = Math.floor(Math.random() * 350);
            var y2 = Math.floor(Math.random() * 350);
        } else { //If not, take the tail of the chain and mutate it by the proposal distribution
            var x = this.results[this.results.length-1].x();
            var y = this.results[this.results.length-1].y();
            var x2 = x + this.prop(this.prop_var);
            var y2 = y + this.prop(this.prop_var);
        }
        if (x2 > 350 || y2 > 350){ //If we get out of bounds values, auto-reject them and move on.
            return new Coords(x, y);
        }  //Otherwise, run the experiment
        ellipse(this.panel1,350,350,x,y);
        ellipse(this.panel2,350,350,x2,y2);
        this.c1.addEventListener('click',function(event){
            this.results.push(new Coords(x,y));
            return new Coords(x,y);
        });
        this.c2.addEventListener('click',function(event){
            this.results.push(new Coords(x2,y2));
            return new Coords(x2,y2);
        });
    };


}
