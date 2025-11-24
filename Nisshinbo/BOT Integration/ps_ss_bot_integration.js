/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */

define(['N/task', 'N/log', 'N/search', 'N/record', 'N/https', 'N/format', 'N/runtime', './moment.js', './ps_bot_constants'],
    function (task, log, search, record, https, format, runtime, moment, CONSTANTS) {

        function execute(context) {
            try {
                log.debug('Scheduled Script', 'Script executed successfully');
                const currencies = getCurrencies();
                log.debug('Currencies', JSON.stringify(currencies));
                getExchangeRateFromBOT(currencies);
            } catch (e) {
                log.error('Error executing script', e.toString());
            }
        }

        function getCurrencies() {
            const currencies = [];
            let lastWorkingDay = moment.utc().subtract(6, 'days');
            log.debug('Last Working Day', lastWorkingDay.format('DD/MM/YYYY'));
            const sourceDate = lastWorkingDay.format('DD/MM/YYYY');
            const formattedDate = moment(sourceDate, 'DD/MM/YYYY').format('YYYY-MM-DD');
            var customrecord_ps_exchange_currencySearchObj = search.create({
                type: "customrecord_ps_exchange_currency",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_ps_ex_currency", label: "Currency" }),
                        search.createColumn({ name: "custrecord_ps_ex_currency_unit", label: "Unit" })
                    ]
            });
            var searchResultCount = customrecord_ps_exchange_currencySearchObj.runPaged().count;
            log.debug("customrecord_ps_exchange_currencySearchObj result count", searchResultCount);
            customrecord_ps_exchange_currencySearchObj.run().each(function (result) {
                currencies.push({
                    baseCurrency: CONSTANTS.BASE_CURRENCY,
                    sourceCurrency: result.getText({ name: 'custrecord_ps_ex_currency' }),
                    sourceCurrencyId: result.getValue({ name: 'custrecord_ps_ex_currency' }),
                    exchangeRateUnit: result.getValue({ name: 'custrecord_ps_ex_currency_unit' }),
                    sourceDate: formattedDate
                });
                return true;
            });

            return currencies;
        }

        function getExchangeRateFromBOT(currenciesArr) {
            for (let i = 0; i < currenciesArr.length; i++) {
                const currency = currenciesArr[i];
                const sourceCurrency = currency.sourceCurrency;
                const sourceDate = currency.sourceDate;
                const todayDate = moment.utc().format('YYYY-MM-DD');
                const clientId = runtime.getCurrentScript().getParameter({ name: 'custscript_ps_bot_int_client_id' });
                const token = runtime.getCurrentScript().getParameter({ name: 'custscript_ps_bot_token' });
                // const endpoint = `https://apigw1.bot.or.th/bot/public/Stat-ExchangeRate/v2/DAILY_AVG_EXG_RATE/?start_period=${sourceDate}&end_period=${todayDate}&currency=${sourceCurrency}`;
                const endpoint = `https://gateway.api.bot.or.th/Stat-ExchangeRate/v2/DAILY_AVG_EXG_RATE/?start_period=${sourceDate}&end_period=${todayDate}&currency=${sourceCurrency}`;
                const headers = {
                    // 'Accept': 'application/json',
                    // 'X-IBM-Client-Id': clientId
                    'Accept': '*/*',
                    'Authorization': token
                };
                log.debug('token', token);
                log.debug('Endpoint', endpoint);

                const response = https.get({
                    url: endpoint,
                    headers: headers
                });
                log.debug('Response', response);
                if (response.code === 200) {
                    const responseBody = JSON.parse(response.body);
                    log.debug('responseBody==', responseBody);
                    log.debug('responseBody.result.data==', responseBody.result.data);
                    if(responseBody.result.data){
                        
                        const dataDetails = responseBody.result.data.data_detail;
                        const timestamp = responseBody.result.timestamp;
                        log.debug('Data Details', dataDetails);
                        const latestDataEntry = dataDetails[0];
                        if (latestDataEntry) {
                            const exchangeRateUnit = currency.exchangeRateUnit || 1;
                            currency.buyingRate = (latestDataEntry.buying_transfer / exchangeRateUnit).toFixed(6);
                            currency.sellingRate = (latestDataEntry.selling / exchangeRateUnit).toFixed(6);
                            currency.exchangeRate = (latestDataEntry.mid_rate / exchangeRateUnit).toFixed(6);
                            if (latestDataEntry.period) {
                                currency.effectiveDate = moment(latestDataEntry.period, 'YYYY-MM-DD').format('DD/MM/YYYY');
                            }
                            currency.sourceDate = moment(timestamp).format('DD/MM/YYYY');
                            log.debug('Custom Exchange Rate Record', currency);
                            updateCustomExchangeRateRecord(currency);
                            createStdCurrencyExchangeRateRecord(currency);
                        }

                    }
                } else {
                    throw 'Error fetching exchange rate from BOT' + response;
                }
            }
        }

        function updateCustomExchangeRateRecord(custExRateRecord) {
            const custExRateRec = record.create({
                type: 'customrecord_ps_cust_exchange_rate',
                isDynamic: true
            });
            custExRateRec.setValue({
                fieldId: 'custrecord_ps_cer_base_currency',
                value: CONSTANTS.BASE_CURRENCY
            });
            custExRateRec.setValue({
                fieldId: 'custrecord_ps_cer_source_currency',
                value: custExRateRecord.sourceCurrencyId
            });
            custExRateRec.setValue({
                fieldId: 'custrecord_ps_cer_buying_rate',
                value: custExRateRecord.buyingRate
            });
            custExRateRec.setValue({
                fieldId: 'custrecord_ps_cer_selling_rate',
                value: custExRateRecord.sellingRate
            });
            custExRateRec.setValue({
                fieldId: 'custrecord_ps_cer_exchange_rate',
                value: custExRateRecord.exchangeRate
            });
            custExRateRec.setText({
                fieldId: 'custrecord_ps_cer_effective_date',
                text: custExRateRecord.effectiveDate
            });
            custExRateRec.setText({
                fieldId: 'custrecord_ps_cer_source_date',
                text: custExRateRecord.sourceDate
            });
            const custExRateRecId = custExRateRec.save();
            log.debug('Custom Exchange Rate Record Updated', custExRateRecId);
        }

        function createStdCurrencyExchangeRateRecord(custExRateRecord) {
            const currencyExchangeRateRec = record.create({
                type: 'currencyrate',
                isDynamic: true
            });
            currencyExchangeRateRec.setValue({
                fieldId: 'basecurrency',
                value: custExRateRecord.baseCurrency
            });
            currencyExchangeRateRec.setValue({
                fieldId: 'transactioncurrency',
                value: custExRateRecord.sourceCurrencyId
            });
            currencyExchangeRateRec.setValue({
                fieldId: 'exchangerate',
                value: custExRateRecord.exchangeRate
            });

            const currencyExchangeRateRecId = currencyExchangeRateRec.save();
            log.debug('Currency Exchange Rate Record Created', currencyExchangeRateRecId);
        }

        return {
            execute: execute
        };
    });