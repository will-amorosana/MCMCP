const axios = require('axios');

axios.get('http://localhost:3000/checkout/')
    .then(function (response) {
        console.log(response.data);
    })
    .catch(function (error) {
        console.log(error);
    });
