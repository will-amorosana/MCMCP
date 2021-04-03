import * as path from "path";

const { chromium } = require('playwright');
const express = require("express");
const fs = require('fs')
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
const port = 1999

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const otf_downloadSelector = "#menu > div > fieldset > div:nth-child(4) > div > a:nth-child(1)";
const param_names: string[] = [
    "param-unit_width",
    "param-pen_width",
    "param-cap_height",
    "param-bar_height",
    "param-ascender_height",
    "param-descender_height",
    "param-x_height",
    "param-horizontal_increase",
    "param-vertical_increase",
    "param-contrast",
    "param-superness",
    "param-slant",
    "param-aperture",
    "param-corner",
    "param-overshoot",
    "param-taper"];

let browser;
let page;
let preview_box;
const test_text: string = "Fix problem quickly with galvanized jets. Pack my red box with five dozen quality jugs. "+
    "Few black taxis drive up major roads on quiet hazy nights.  By Jove, my quick study of lexicography won a prize. " +
    "Grumpy wizards make a toxic brew for the jovial queen. Waxy and quivering, jocks fumble the pizza. Sphinx of black quartz, judge my vow."



let min_values = [0.75,
    0.15,
    0.75,
    0.31,
    0.8,
    0.25,
    0.5,
    0,
    0,
    1,
    0.6,
    -0.2,
    0,
    0,
    0,
    0]
let max_values = [2,
    0.99,
    1,
    0.75,
    1.15,
    0.65,
    0.8,
    0.75,
    0.75,
    2,
    1,
    0.2,
    0.75,
    1.5,
    0.8,
    1]

let hashCode = s => s.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)


//Input: 16-number array params, each param in interval [0,100]. Actual value of param, multiplied by 100 on client side
//Output: 16-float array params, each param in interval [min_p, max_p] where p is the parameter in question. Each is rounded to 2 decimals
function format_values(params: string[]){
    let input = Object.values(params);
    let output: number[] = [];
    for(let i: number = 0; i < input.length; i++){

        let out = (parseInt(input[i])/100) * (max_values[i] - min_values[i]) +  (min_values[i]);
        output.push(Math.round((out + Number.EPSILON) * 100) / 100)//Round each parameter to 2 decimal places
    }
    return output;
}

async function init(){
    console.log("Setting up...")
    // browser = await chromium.launch();
    browser = await chromium.launch({ headless: false, slowMo: 50});
    page = await browser.newPage({acceptDownloads: true});
    await page.goto("https://www.metaflop.com/modulator"); //Go to Metaflop
    await page.waitForLoadState("networkidle");
    await page.click("#parameter-panel > div > div > div:nth-child(2) > div > a.parameter-panel-mode-toggle.adjusters"); //Nerd mode
    await page.click("#param-text", {clickCount: 3});//Disable glyph/chart
    await page.keyboard.press('Backspace');
    await page.fill("#param-text", test_text);
    await page.click("#preview-typewriter > div > div.font-size > div");
    await page.click("#preview-typewriter > div > div.font-size > ul > li:nth-child(2) > a");
    await sleep(1000);
    console.log("Done with setup!")
    preview_box = await page.$(`#preview-typewriter > div > div.preview-text-wrapper`)
}

async function set_params(params: number[]){//Does the whole rigamarole
    if(params.length != 16){
        console.log("params must be 16 values long!");
        return null;
    }
    for (let i = 0; i < 16; i++){
        await page.fill("#"+param_names[i], params[i].toString());
    }
    await sleep(2000);
}



app.get("/font/:a-:b-:c-:d-:e-:f-:g-:h-:i-:j-:k-:l-:m-:n-:o-:p", async (req, res) => {
    console.log("Request Received!")
    let params = format_values(req.params);
    console.log(params);
    await set_params(params);


})

app.listen(port, () => {
    console.log(`Chekhov is now listening at http://localhost:${port}`);
});


(async () => {
    await init();
})();
