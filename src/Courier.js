const axios = require("axios");
send = false;
let output = {
    accept: false,
    chains: null,
    id: null,
    lin_ID: null,
};
const btn = document.getElementById('btn')
btn.onclick = get_img

function get() {
    axios
        .get("http://localhost:3000/checkout/")
        .then(function (response) {
            console.log(response.data);
        })
        .catch(function (error) {
            console.log(error);
        });
}

function post() {
    axios
        .post("http://localhost:3000/checkin/", output)
        .then(function (response) {
            console.log(response.data);
        })
        .catch(function (error) {
            console.log(error);
        });
}

function save_output() {
    axios
        .post("http://localhost:3000/output/")
        .then(function (response) {
            console.log(response.data);
        })
        .catch(function (error) {
            console.log(error);
        });
}



function get_img() {
    var image = document.getElementById('canvas');
    var downloadingImage = new Image();
    downloadingImage.onload = function(){
        image.src = this.src;
    };
    downloadingImage.src = "http://localhost:1999/screen/0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0/";
}

//setInterval(output, 10000);
// save_output();
