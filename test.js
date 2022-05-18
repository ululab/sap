const Sap = require('./index');
const fs = require('fs');
// or
// const Sap = require('./lib/sap');

async function run() {
   var sap = await Sap.connect();
   console.log(sap);
   await sap.disconnect();
}

 // run();







async function findAnagrafica(code) {
  // ID univoco del lead/cliente CardCode

  // Campo che definisce la P.IVA LicTradNum

  // Codice Fiscale AddId

  // Ragione Sociale / Nome  Cognome CardName

  // Tipo Business Partner CardType [C=Cliente, L=Lead, S= Fornitore]

  var sap = await Sap.connect();

  await sap.get('BusinessPartners', {'$select': 'CardCode,FederalTaxID', $filter: `startswith(FederalTaxID, '${code}')`});

  console.log(sap);

  await sap.disconnect();

  console.log(sap);

  console.log( 'data.responseData' );

  console.log(sap.responseData.value )
  return sap;
}

// findAnagrafica('IT0762963015');

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

async function insertPreventivo() {

   var data = {
     CardCode:  'C000082', // Codice cliente sap
     U_MCR_STATOFF: '001',
     DocDate: '2022-03-23',
     DocumentLines: [
         {
             ItemCode: 'PREVENTIVO CRM',
             Quantity: '1',
             TaxCode: 'T1',
             UnitPrice: '3434'
         }
     ]
   };

   var sap = await Sap.connect();
   console.log(sap);
   await sap.post('Quotations', data);

   await sap.disconnect();

   console.log(sap);

   return sap;
 }

// insertPreventivo();

let pdf = fs.readFileSync('test/file-preventivo.pdf').toString();

//console.log(pdf);

async function invioDocumentoPreventivo() {

  var sap = await Sap.connect();
  sap.debug = true;
  sap.setHeaders({'Content-Type': 'multipart/form-data;boundary=--webappPDF--'});

  console.log(sap.getHeaders());
  var data1 = [
    '--webappPDF--\n\n',
    'Content-Disposition: form-data; name="webapp_test_AndreaCeccatoUlulab_001";\n',
    'filename="webapp_test_AndreaCeccatoUlulab_001.pdf"\n',
    'Content-Type: application/pdf\n\n',
    `${pdf}\n\n`,
    '--webappPDF--\n',
  ];

  //console.log(data1.join(''));

  await sap.post('Attachments2', data1.join(''));
  /*var data2 = {
    Attachments2_Lines: [
      {
        FileExtension: '.pdf',
        FileName: 'webapp_test_AndreaCeccatoUlulab_001.pdf',
        SourcePath: '/test',
      }
    ]
  }*/
  //await sap.post('Attachments2', data2);
  //console.log(sap);

  //await sap.patch(`Quotations(1173)`, {});
  // console.log(sap.getHeaders())
  await sap.disconnect();

  console.log(Object.keys(sap.axiosObject));
  console.log(sap.axiosObject.response);
  //console.log(sap);
  return sap;

}

async function debug() {
  var sap = await Sap.connect();
  sap.debug = false;
  
  await sap.disconnect();
}

//debug();
//console.log(pdf);

//invioDocumentoPreventivo();


async function testConn() {
  let dataConn = {
    "timestampStartSession": 1652867440003,
    "timestampExpireSession": 1652868160003,
    "loginData": {
      "odata.metadata": "https://meditsl.gendata.it:50000/b1s/v1/$metadata#B1Sessions/@Element",
      "SessionId": "f95147f0-d68f-11ec-8000-005056a0e477",
      "Version": "1000170",
      "SessionTimeout": 720
    }
  };

  var sap = await Sap.connect(dataConn);
  sap.debug = false;
  console.log(sap);

  let update = {
    date: '2022-05-17',
    time: '01:00:00'
  };

  await sap.get('BusinessPartners', {'$select': 'CardCode,FederalTaxID,UpdateDate,UpdateTime', 
                                      // $filter: `startswith(FederalTaxID, '${'IT0762963015'}')`,
                                      $filter: `UpdateDate ge '${update.date}',UpdateTime ge '${update.time}'`,
                                    });
  console.log(sap.responseData);
  await sap.disconnect();
  console.log(sap);
}

testConn();