import axios from "axios";
import * as cheerio from "cheerio";
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js'

console.log("Prebran URL:", process.env.SUPABASE_URL);

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, supabaseKey); 



async function scrapeData(){
    var mainUrl = "https://www.nepremicnine.net/oglasi-oddaja/podravska/stanovanje/cena-do-500-eur-na-mesec/"; 
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
        
        let referenceNumbers = []; 
        for(let element of responses){
            const $ = cheerio.load(element); 
            let referenceNumber = $("div.desc-box").find('strong.fs-15').text(); 
            referenceNumbers.push(referenceNumber); 
        }
    
        printRefNumbers(referenceNumbers); 
        await insertData(referenceNumbers); 
        
        const { data, error } = await supabase.from('my_table').select('*'); 
        console.log("Data", data); 
        console.log("Error", error);

        
        
    }catch(error){
        console.log("Error:", error); 
    }
}


scrapeData();

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
