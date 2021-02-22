const axios = require("axios");
send = false;
let output = {
    accept: false,
    chains: null,
    id: null,
    lin_ID: null,
};

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

//setInterval(output, 10000);
save_output();
