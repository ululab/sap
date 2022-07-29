const axios = require('axios');
const { privateDecrypt } = require('crypto');
const https = require('https');

/**
 * Gestione tempi chiamata http co axios
 */
 axios.interceptors.request.use((config) => {
   config.headers['request-startTime'] = new Date().getTime();
   config.headers['X-Requested-With'] = 'XMLHttpRequest';
   // config.headers['Content-Type'] = 'application/json';
   config.httpsAgent = new https.Agent({
     rejectUnauthorized: false
   });
   return config
 })

 axios.interceptors.response.use((response) => {
   const currentTime = new Date().getTime()
   const startTime = response.config.headers['request-startTime']
   response.headers['request-duration'] = currentTime - startTime
   console.log('Tempi risposta: ' + response.headers['request-duration'] + 'ms');
   return response
 })

/**
 * Classe per collegamenti e chiamate a SAP
 *
 */
class Sap {

    /**
     * Stampaggio dei messaggi di successo a fine request e errore nella console
     * e salvataggio delle response axios nell'attributo axiosObject
     */
    debug = false

    /**
     * Massimo numero di records nella paginazione della request
     */
    maxPageSize = 999999

    /**
     * Millisisecondi da sottrarre al timestamps corrente per la verivica della validitá
     * Se la sessione é valida per X tempo, la verifica considerá
     * la durata uguale X - millisecondOffsetExipired
     * in modo da poter bloccare la chiamata con un anticipo preimpostato,
     * e poter eseguire il login in modo da aggiornare la sessione
     * 60*60*1000 = ms in un ora
     */
    millisecondOffsetExipired = 3600000

    /**
     * Base url collegamento a Sap
     */
    base = 'http://localhost'

    /**
     * Credenziali di accesso a Sap:
     * CompanyDB
     * UserName
     * Password
     * @type {Object}
     */
    credentials = null

    timestampStartSession = null

    timestampExpireSession = null

    loginData = null

    requestConfig = null

    responseData = null

    axiosObject = null

    /**
     * Riferimento delle chiamate efettuate in ordine cronologico
     * @type {String}
     */
    refSlugRequest = []

    headers = {
        'Content-Type': 'application/json', // default
        // 'Prefer': 'odata.maxpagesize=999999',
    }

    /**
     * Tipo di autenticzione da inserire nell'header:
     * login: Cookie SessionId del login
     * basic: Authorization: 'Basic Base64(Username:Password)'
     * @type string
     */
    authenticationType = 'login'

    /**
     * Costruttore istanza classe Sap
     * @param {Object} settings: Dati di settaggio connesisone iniziale: utile per utilizzare conessioni gia esistenti ed evitare il login
     * @return {Object<Sap>}
     */
    constructor(settings = null) {
        if (settings) {
            // Impostazione base url e credenziali
            this.base = settings.base
            this.credentials = settings.credentials

            this.timestampStartSession = settings.timestampStartSession
            this.timestampExpireSession = settings.timestampExpireSession
            this.loginData = settings.loginData

            if (settings.authenticationType)
              this.authenticationType = settings.authenticationType
        }
    }

    /**
     * Url di base delle api
     * @return {String}
     */
    getBase() {
        return this.base;
    }

    /**
     * Settaggio Url di base delle api
     * @return {String}
     */
    setBase(base) {
        this.base = base;
    }

    /**
     * Settaggio credenzuiali
     * @return {String}
     */
    setCredentials(credentials) {
        this.credentials = credentials;
    }

    /**
     * Ritorna url di base delle API con il percorso completo
     * @return {String}
     */
    url(path = '') {
        return this.getBase() + path;
    }

   /**
     * Settaggio di headers request
     * @param {Object} headersRequest: headers da aggiornare/aggiungiere nella request
     * @return {avoid}
     */
    setHeaders(headersRequest = {}) {
        for (let type in headersRequest) {
            this.headers[type] = headersRequest[type];
        }
    }

    /**
     * Ritorna gli headers per le chiamate dopo il login
     * @return {Object}
     */
    getHeaders() {
      let headers;

      if (this.authenticationType == 'login') {

        headers = this.headers;
        headers.Cookie = `B1SESSION=${this.getSessionId()}; ROUTEID:.node0;`
        headers.Prefer = `odata.maxpagesize=${this.maxPageSize}`

      } else if (this.authenticationType == 'basic') {

        headers = this.headers
        headers.Authorization = 'Basic ' + btoa(`${this.credentials.UserName}:${this.credentials.Password}`)

      }

      return headers;
    }

    /**
     * Ritorna il valore della chiave di sessione se presente
     * Altrimenti se non setttato ritorna null
     * @return {String|null}
     */
    getSessionId() {
        return this.loginData && this.loginData.SessionId ?
                                 this.loginData.SessionId :
                                 null;
    }

    /**
     * Connessione a SAP
     * Effettua l'azione di login con SAP
     * @param {Object} settings: Dati di settaggio connesisone iniziale: utile per utilizzare conessioni gia esistenti ed evitare il login
     * @return {Object}
     */
    static async connect(settings = null) {
        let sap = new Sap(settings);
        //if (sap.isExpiredSession())
        //    await sap.login();
        return sap;
    }

    /**
     * Disconnessione a SAP
     * Effettua l'azione di logout con SAP
     * @return {void}
     */
    async disconnect() {
        await this.logout();
    }

    /**
     * Azione di login
     * @return {void}
     */
    async login() {

        console.log('#-Authentication in progress...');

        // Settaggio timestamp inizio sessione di autentizazione con SAP
        // prima di effettuare il tentativo di login
        this.timestampStartSession = new Date().getTime();

        await axios.post(this.url('Login'), this.credentials)
                        .then( (res) => {

                            // console.log(res.data);
                            this.loginData = res.data

                            // Settaggio timestamp scadenza sessione con SAP
                            // Il timeout di Sap é in sec: conversione timestamps in ms
                            this.timestampExpireSession = this.timestampStartSession + res.data.SessionTimeout*60*1000;
                            console.log('#-Login successful');

                        })
                        .catch( (http) => {

                            console.log(http);

                        })
    }

    /**
     * Azione di logout
     * @return {void}
     */
    async logout() {

        // logout request
        await axios.post(this.url('Logout'))
                        .then( (res) => {
                            this.loginData = null
                            this.timestampStartSession = null
                            this.timestampExpireSession = null
                            console.log('#-Logout successful')
                        })
                        .catch( (http) => {
                            console.log(http);
                        })
    }

    /**
     * Verifica se la sessione di autenticazione con SAP é scaduta
     * @return {void}
     */
    isExpiredSession() {
        return !this.timestampExpireSession || this.timestampExpireSession <= (new Date().getTime() - this.millisecondOffsetExipired)
    }

    /**
     * request generale
     * @return {void}
     */
    async request(config) {

        this.refSlugRequest.push(config.url);

        if (this.authenticationType == 'login' && this.isExpiredSession()) {
          // Controllo se la chiamata fa riferimento al Logout
          if (config.url != 'Logout') {
            await this.login();
          } else {
            return;
          }
        }

        this.requestConfig = config

        // Settaggio di alcuni attributi di configurazione axios
        config.url = this.url(config.url);

        console.log(config);

        config.headers = this.getHeaders();

        config.httpsAgent = new https.Agent({
                                rejectUnauthorized: false
                            });

        console.log(`#-Request start: ${config.method} ${config.url}`);

        await axios(config)
            .then( (response) => {

                 //console.log(response.data);
                console.log(`#-Request end: ${config.method} ${config.url}`);
                this.responseData = response.data

                //console.log(response);
                if (this.debug) {
                  console.log('#SUCCESSO!');
                  this.axiosObject = response
                }


                return response.data;

            })
            .catch( (error) => {

                if (this.debug) {
                  console.log(error);
                  console.log('#ERRORE!');
                  this.axiosObject = error
                }

                return null;
            })
    }

    async get(url, params) {
        await this.request({method: 'get', url: url, params: params});
    }

    async post(url, data) {
        await this.request({method: 'post', url: url, data: data});
    }

    async put(url, data) {
        await this.request({method: 'put', url: url, data: data});
    }

    async delete(url) {
        await this.request({method: 'put', url: url, data: data});
    }

    async patch(url, data) {
        await this.request({method: 'patch', url: url, data: data});
    }

    /**
     * Ritorna il valore interesssato di ritorno della richiesta efettuata a Sap
     * Le chiamate che ritornano:
     * - una collezione di records, la response é un oggetto a due chiavi con la chiave 'value': un array di oggetti
     * - un singolo record, la response é l'oggetto del record
     * @return {Object|null} Valore di ritorno della richiesta Sap
     */
    getResponse() {
      return this.responseData &&
             'value' in this.responseData &&
              Array.isArray(this.responseData.value) &&
              Object.keys(this.responseData).length === 2 ?
              this.responseData.value :
              this.responseData;
    }

    response(keyPath = null) {
      let response = this.getResponse();

      keyPath = (!keyPath || keyPath == '') ? [] : keyPath.split('.');

      if (!response)
        return;

      for (var i = 0; i < keyPath.length; i++) {
         if (keyPath[i] in response) {
           response = response[keyPath[i]];
         } else {
           return;
         }
      }

      return response;
    }

    /**
     * Verifica se la response dell richiesta a Sap é un valore definito
     * @return {Boolean}
     */
    isDefResponse() {
      return this.responseData !== undefined && this.responseData !== null;
    }

    /**
     * Azione generale a SAP
     * @return {Object} Oggetto classe Sap
     */
     static async action(settings, doLogout = true) {

        if (!settings.url) {
            console.error(`Url request not given`);
            return;
        }

        var sap = await Sap.connect();

        await sap.request(settings);

        if (doLogout)
            sap.logout()

        return sap;

    }

   /**
     * Funzione di settaggio custom per tutte le chiamate a SAP
     * Scorciatoie, alias delle chiamate rest, per poterne facilitare l'utilizzo
     *
     * Qui scriviamo tutte le funzioni comode per il reperimento di alcuni dati
     *
     * @return {Object} Oggetto classe Sap
     */
    static async run(actionName, doLogout) {

        var settings = {
            url: '',
            method: 'get',
            params: {},
            data: {}
        }

        switch(actionName) {
            case 'getBusinessPartners':
                settings.url = 'BusinessPartners'
                settings.params = {'$select': 'CardCode,CardType'}
            break;

            case 'oooo':
            break;

            case 'xxxx':
            break;

        }
        return await Sap.action(settings, doLogout);
    }

}

module.exports = Sap;
module.exports.default = Sap;
