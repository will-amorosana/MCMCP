const axios = require('axios');
send = false;
if(send){
    axios.get('http://localhost:3000/checkout/')
        .then(function (response) {
            console.log(response.data);
        })
        .catch(function (error) {
            console.log(error);
        });
}else{
    let output= {
        accept: false,
        chains: null,
        id: null,
        lin_ID: null
    };
    axios.post("http://localhost:3000/checkin/", output)
        .then(function (response) {
        console.log(response);
    }).catch(function(error) {
        console.log(error)
    });
}



