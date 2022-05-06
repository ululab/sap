const Sap = require('./index');
// or
// const Sap = require('./lib/sap');

async function run() {
   var sap = await Sap.connect();
   await sap.disconnect();
}

run();










async function findAnagrafica(code) {
  // ID univoco del lead/cliente CardCode

  // Campo che definisce la P.IVA LicTradNum

  // Codice Fiscale AddId

  // Ragione Sociale / Nome  Cognome CardName

  // Tipo Business Partner CardType [C=Cliente, L=Lead, S= Fornitore]

  var sap = await Sap.connect();

  await sap.get('BusinessPartners', {});

  console.log(sap);

  await sap.disconnect();

  console.log(sap);

  return sap;
}

// console.log( findAnagrafica('code') );


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
