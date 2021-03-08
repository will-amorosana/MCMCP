for(let i = 0; i < 1000000; i++){
    var x = (Math.floor(Math.random() * 101))
    if(x < 0) console.log("Too Low!")
    // if(x==0)console.log("Bottoms Up!")
    // if(x==100)console.log("All the Way Up!")
    if(x>100) console.log("Too High!")
}
console.log("Done!")