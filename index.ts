import axios from "axios";
import * as cheerio from "cheerio";
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js'
import nodemailer from "nodemailer";

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
    var mainUrl = "https://www.nepremicnine.net/oglasi-oddaja/podravska/maribor/mb-center,maribor,za-kalvarijo,koroska-vrata/stanovanje/cena-do-500-eur-na-mesec/?nadst%5B0%5D=vsa&nadst%5B1%5D=vsa"; 
    var options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
            'Accept': 'application/json'
        }}

    try{
        const wholeData = await axios.get(mainUrl, options); 
        const $ = cheerio.load(wholeData.data); 

        let elementUrls : string[] = []; 

        $("div.property-box").each((index, element) => {
            let elementUrl = $(element).find('meta[itemprop="mainEntityOfPage"]').attr('content'); 
            //console.log(element)
            if(elementUrl)
                elementUrls.push(elementUrl);
        })

        let responses = []; 
        for(let url of elementUrls){
             const result = await axios.get(url, options); 
             responses.push(result.data); 
        }
        
        let singleData = []; // TU DOBIS VSE OGLASE; SHRANIS V OBJEKTE
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
        console.log(fetchedData); 

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

        console.log(newData); 
        insertData(newData); // VSE NOVE VSTAVIS V BAZO
        sendMail(newData); 
        
    }catch(error){
        console.log("Error:", error); 
    }
}

function printRefNumbers(data : any[]){
    for(let element of data){
        console.log(element);
    }
}

async function insertData(data : any[]){
    for(let element of data){
        const { error } = await supabase
        .from('my_table')
        .insert({ ref_number : element}); 
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
        from: '"Nepremičnine.net Scraper" domen.sapac420@gmail.com>',
        to: 'domen.sapac10@gmail.com, potocnik.126@gmail.com',
        subject: 'Nov oglas!',
        html : htmlString
    }

    return transporter.sendMail(mailOptions);
}

scrapeData();


