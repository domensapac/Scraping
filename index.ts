import * as cheerio from "cheerio";
import { createClient } from '@supabase/supabase-js'
import nodemailer from "nodemailer";
import { chromium } from 'playwright-extra';
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!
const mailPass = process.env.NODEMAILER_PASS!

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'domen.sapac420@gmail.com',
        pass: mailPass
    }
});

console.log("Prebran URL:", process.env.SUPABASE_URL);

export const supabase = createClient(supabaseUrl, supabaseKey); 



async function scrapeData(){
    var mainUrl = "https://www.nepremicnine.net/oglasi-oddaja/podravska/maribor/mb-center,maribor,za-kalvarijo,koroska-vrata/stanovanje/1-sobno,15-sobno,2-sobno,garsonjera/cena-do-500-eur-na-mesec/?nadst%5B0%5D=vsa&nadst%5B1%5D=vsa"; 
    
    //const browser = await chromium.launch({ headless: true });
    const context = await chromium.launchPersistentContext('./browser-data', {
        headless: true, // Drži na false, dokler ne deluje 100%
        
    });

    const page = await context.newPage();

    try{
        await page.goto(mainUrl, { waitUntil: 'load', timeout: 60000 });
        const wholeData = await page.content();
        const $ = cheerio.load(wholeData); 

        let elementUrls : string[] = []; // URLJI VSEH OGLASOV 

        $("div.property-box").each((index, element) => {
            let elementUrl = $(element).find('meta[itemprop="mainEntityOfPage"]').attr('content'); 
            if(elementUrl)
                elementUrls.push(elementUrl);

        })

        let responses = []; // HTML KODA VSAKEGA POSAMEZNEGA OGLASA
        for(let url of elementUrls){
            await page.goto(url, { waitUntil: 'load', timeout: 60000 }); 

            
            const title = await page.title();
            if (title.includes("Just a moment")) {
                await page.waitForTimeout(30000); 
            }

            const result = await page.content(); 
            responses.push(result); 
        }
        
        let singleData = []; // TU IMAS VSE OGLASE; SHRANIS V OBJEKTE
        let i = 0; 
        for(let element of responses){
            const $ = cheerio.load(element); 
            let objRefNumber = $("div.desc-box").find('strong.fs-15').text(); 
            let objTitle = $("div.single-title").find('h1').text(); 
            let objDescription = $("div.desc-box").find('p:first').text(); 
            let objPrice = $("div.cena").find('span').text(); 
            let objImage = $("div.galerija-container").find('img').attr('src'); ; 

            let singleObject = {
                ref_number : objRefNumber,
                title : objTitle,
                description : objDescription,
                price : objPrice,
                imageUrl : objImage,
                link : elementUrls[i]
            }
            
            i++; 
            singleData.push(singleObject); 
        }
    
        const fetchedData = await loadData(); 

        let newData = []; 

        if(fetchedData){
            for(let newElement of singleData){
                let exists = false; 
                for(let existingElement of fetchedData){
                    if(existingElement.ref_number == newElement.ref_number){
                        exists = true; 
                        break; 
                    }
                }
                if(!exists){
                    newData.push(newElement);
                }
            }
        }

        console.log("Pregledanih oglasov: ", singleData.length); 
        console.log("Novih oglasov: ", newData.length); 

        if(newData.length > 0){
            await insertData(newData); // VSE NOVE VSTAVIS V BAZO
            await sendMail(newData); 
        }
            
        
    }catch(error){
        console.log("Error:", error); 
    }finally {
        await context.close(); 
        transporter.close();
    }
}

async function insertData(data : any[]){
    for(let element of data){
        const { error } = await supabase
        .from('my_table')
        .insert({ ref_number : element.ref_number, 
                title : element.title,
                description : element.description,
                price : element.price
        }); 
    }
}

async function loadData(){
    const { data, error } = await supabase.from('my_table').select('*'); 
    return data; 
}

async function sendMail(data : any[]){
    let htmlString = '<h2>NAJDENI NOVI OGLASI !</h2>'; 

    for(let element of data){
        htmlString+= `  <h3> ${element.title} </h3>
                        <p> ${element.description} </p> 
                        <strong> ${element.price} </strong>
                        <br>
                        <a href='${element.link}'> Povezava do oglasa </a>
                        <br>
                        <img style='height:300px;' src='${element.imageUrl}' alt='pic'>`
    }

    const mailOptions = {
        from: '"Nepremičnine.net Scraper" <domen.sapac420@gmail.com>',
        to: 'domen.sapac10@gmail.com',
        subject: 'Nov oglas!',
        html : htmlString
    }

    return transporter.sendMail(mailOptions);
}

scrapeData();


