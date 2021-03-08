import * as path from "path";

const { chromium } = require("playwright");
const express = require("express");
const fs = require("fs");
const cors = require("cors");
const app = express();
app.use(cors());
const port = 1999;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
const otf_downloadSelector =
    "#menu > div > fieldset > div:nth-child(4) > div > a:nth-child(1)";
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
    "param-taper",
];
let browser;
const test_text: string =
    "Fix problem quickly with galvanized jets. Pack my red box with five dozen quality jugs. " +
    "Few black taxis drive up major roads on quiet hazy nights.  By Jove, my quick study of lexicography won a prize. " +
    "Grumpy wizards make a toxic brew for the jovial queen. Waxy and quivering, jocks fumble the pizza. Sphinx of black quartz, judge my vow.";
//let default_test: string = "localhost:1999/screen/60-90-60-50-40-12-30-0-0-10-65-50-80-70-14-60/"
const min_values = [
    0.75,
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
    0,
];
const max_values = [
    2,
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
    1,
];

let hashCode = (s) =>
    s.split("").reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
    }, 0);
let theBoys: ScreenRipper[] = [];

//Input: 16-number array params, each param in interval [0,100]. Actual value of param, multiplied by 100 on client side
//Output: 16-float array params, each param in interval [min_p, max_p] where p is the parameter in question. Each is rounded to 2 decimals
function format_values(params: string[]) {
    let input = Object.values(params).slice(1);
    let output: number[] = [];
    for (let i: number = 0; i < input.length; i++) {
        let out =
            (parseInt(input[i]) / 100) * (max_values[i] - min_values[i]) +
            min_values[i];
        output.push(Math.round((out + Number.EPSILON) * 100) / 100); //Round each parameter to 2 decimal places
    }
    return output;
}

class ScreenRipper {
    busy = true;
    preview_box;
    id: number;
    page;

    constructor(id: number) {
        this.id = id;
        this.init().then();
    }

    async init() {
        this.page = await browser.newPage({acceptDownloads: true});
        await this.page.goto("https://www.metaflop.com/modulator"); //Go to Metaflop
        await this.page.waitForLoadState("networkidle");
        await this.page.click(
            "#parameter-panel > div > div > div:nth-child(2) > div > a.parameter-panel-mode-toggle.adjusters"
        ); //Nerd mode
        await this.page.click("#param-text", {clickCount: 3}); //Disable glyph/chart
        await this.page.keyboard.press("Backspace");
        await this.page.fill("#param-text", test_text);
        await this.page.click("#preview-typewriter > div > div.font-size > div");
        await this.page.click(
            "#preview-typewriter > div > div.font-size > ul > li:nth-child(2) > a"
        );
        await sleep(1000);
        console.log("Instance " + this.id + " set up successfully!");
        this.preview_box = await this.page.$(
            `#preview-typewriter > div > div.preview-text-wrapper`
        );
        this.busy = false;
    }

    async set_params(params: number[]) {
        this.busy = true;
        if (params.length != 16) {
            console.log("params must be 16 values long!");
            return null;
        }
        for (let i = 0; i < 16; i++) {
            await this.page.fill("#" + param_names[i], params[i].toString());
        }
    }

    async download(filename: string) {
        const [download] = await Promise.all([
            this.page.waitForEvent("download"),
            this.page.click(otf_downloadSelector),
        ]);
        await download.saveAs(filename + ".otf");
        this.busy = false;
        // await console.log("Download complete!")
    }

    async screen(filename: string) {
        // console.log("Screenshotting...");
        await this.page.hover("#parameter-panel > div > div > div:nth-child(2) > div > a.parameter-panel-mode-toggle.adjusters")
        await sleep(3000);
        await this.preview_box.screenshot({ path: filename + ".png" });
        await sleep(100);
        this.busy = false;
    }


}






app.get(
    "/:format/:a-:b-:c-:d-:e-:f-:g-:h-:i-:j-:k-:l-:m-:n-:o-:p",
    async (req, res) => {
        let params = format_values(req.params);
        let filename: string = `fonts/font` + hashCode(params.toString()); //Generate a unique hash filename for that font
        try {
            if (fs.existsSync(filename + ".png")) {
                //Checks if font already exists before checking for a new one
                // console.log("File " + filename + " already exists! Forwarding...");
                await res.sendFile(
                    path.join(__dirname, "../", filename + ".png")
                );
            } else {
                let ripper: ScreenRipper = null;
                do{
                    for(let i: number = 0; i < 6; i++){
                        if(!theBoys[i].busy){
                            ripper = theBoys[i]
                            break;
                        }
                    }
                    if(!ripper) await sleep(1000);
                }while(!ripper);
                console.log("New request is being served!");
                await ripper.set_params(params);
                await ripper.screen(filename);
                await res.sendFile(
                    path.join(__dirname, "../", filename + ".png")
                );
                // console.log("Sent" + filename + "!");
            }
        } catch (err) {
            console.error(err);
        }


    }
);



(async () => {
    browser = await chromium.launch({});
    for(let i: number = 0; i < 6; i++){
        theBoys.push(new ScreenRipper(i));
    }
    app.listen(port, () => {
        console.log(`Chekhov is now listening at http://localhost:${port}`);
    });
})();
