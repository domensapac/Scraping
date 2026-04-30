import axios from "axios";
import * as cheerio from "cheerio";

try{
    let options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1'
    }
    }
    let url = "https://www.nepremicnine.net/oglasi-oddaja/podravska/stanovanje/cena-do-500-eur-na-mesec/"; 
    const response = await axios.get(url, options);
    
    const $ = cheerio.load(response.data); 

    /*
    $("div.property-details h2, div.property-details>h6").each((index, element) => {
        //console.log($(element).text() + "\n"); 
    })
    */
    $("div.property-box").each((index, element) => {
        //console.log($('meta[itemprop="mainEntityOfPage"]').first().attr('content') + "\n") ;
        let elementUrl = $('meta[itemprop="mainEntityOfPage"]').first().attr('content'); 
        
    })

}catch (error){
    console.error("Error: ", error.message); 
}



