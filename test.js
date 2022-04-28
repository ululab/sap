// import sap from 'sap'
import Sap from './index.js'

var sapConnection = await Sap.connect();

console.log( sapConnection );

//var sap1 = await Sap.connect();

// await sap1.disconnect()
// console.log(sap1);

//console.log(sap1.isExpiredSession());
// console.log(sap1.getHeaders());

//sap1.request({
  //  url: 'BusinessPartners',
   // method: 'get'
//});

/*var sap2 = await Sap.action({
                url: 'BusinessPartners',
                method: 'get',
                params: {
                   '$select': 'CardCode,CardType'
                }
            });*/


// sap.get('BusinessPartners', {})

// var sapApi = await Sap.run('getBusinessPartners');
