const axios = require('axios');
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

    debug = false

    credentials = null

    timestampStartSession = null

    timestampExpireSession = null

    loginData = null

    responseData = null

    axiosObject = null

    headers = {
        'Content-Type': 'application/json', // default
    }
    /**
     * Costruttore istanza classe Sap
     * @param {Object} settings: Dati di settaggio connesisone iniziale: utile per utilizzare conessioni gia esistenti ed evitare il login
     * @return {Object<Sap>}
     */
    constructor(settings = null) {
        if (settings) {
            this.timestampStartSession = settings.timestampStartSession
            this.timestampStartSession = settings.timestampExpireSession
            this.loginData = settings.loginData
        }
    }

    /**
     * Url di base delle api
     * @return {String}
     */
    static base() {
        return 'https://meditsl.gendata.it:50000/b1s/v1/';
    }

    /**
     * Ritorna url di base delle API con il percorso completo
     * @return {String}
     */
     static url(path = '') {
        return this.base() + path;
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
        let headers = this.headers;
        headers.Cookie = `B1SESSION=${this.loginData.SessionId}; ROUTEID:.node0;`
        return headers;
    }

    /**
     * Connessione a SAP
     * Effettua l'azione di login con SAP
     * @param {Object} settings: Dati di settaggio connesisone iniziale: utile per utilizzare conessioni gia esistenti ed evitare il login
     * @return {Object}
     */
    static async connect(settings = null) {
        let sap = new Sap(settings);
        if (sap.isExpiredSession())
            await sap.login();
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

        await axios.post(Sap.url('Login'),
                        {
                            CompanyDB: 'TESTMEDIT',
                            UserName: 'utEsterno',
                            Password: 'cr0M@test3'
                        })
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
        await axios.post(Sap.url('Logout'))
                        .then( (res) => {
                            this.loginData = null
                            this.timestampStartSession = null
                            this.timestampExpireSession = null
                            console.log('#-Logout successful')
                        })
                        .catch( (http) => {
                            console.log(http.response.data);
                        })
    }

    /**
     * Verifica se la sessione di autenticazione con SAP é scaduta
     * @return {void}
     */
    isExpiredSession() {
        return this.timestampExpireSession && this.timestampExpireSession < new Date().getTime()
    }

    /**
     * request generale
     * @return {void}
     */
    async request(config) {

        if (this.isExpiredSession()) {
            await this.login()
        }

        // Settaggio di alcuni attributi di configurazione axios
        config.url = Sap.url(config.url);

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
                console.log(error);

                if (this.debug) {
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
