/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log', 'N/search', './moment.js', './ps_bot_constants', 'N/runtime'], 
    function(record, log, search, moment, CONSTANTS, runtime) {  

    function beforeSubmit(context) {

        let executionContext = runtime.executionContext;
        if(executionContext !== runtime.ContextType.CSV_IMPORT ) { return; }

        if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
            return;
        }

        const newRecord = context.newRecord;
        const recordType = newRecord.type;
        const exchangeRateMap = CONSTANTS.TRANSACTION_EXCHANGE_RATE_MAP;
        const currency = newRecord.getValue({ fieldId: 'currency' });
        const trandate = newRecord.getValue({ fieldId: 'trandate' });

        if (currency === CONSTANTS.BASE_CURRENCY) {
            return;
        }

        if (exchangeRateMap.buying_rate.indexOf(recordType) > -1 && currency) {
            const exchangeRate = getBuyingExchangeRate(currency, trandate);
            if (exchangeRate) {
                newRecord.setValue({ fieldId: 'exchangerate', value: exchangeRate });
            }
        } else if (exchangeRateMap.selling_rate.indexOf(recordType) > -1 && currency) {
            const exchangeRate = getSellingExchangeRate(currency, trandate);
            if (exchangeRate) {
                newRecord.setValue({ fieldId: 'exchangerate', value: exchangeRate });
            }
        }
    }

    function getBuyingExchangeRate(currency, trandate) {
        const formattedTrandate = moment(trandate).format('D/MM/YYYY');
        const exchangeRateSearch = search.create({ 
            type: 'customrecord_ps_cust_exchange_rate',
            filters: [
                ['custrecord_ps_cer_source_currency', 'is', currency],
                'AND',
                ['custrecord_ps_cer_effective_date', 'onorbefore', formattedTrandate]
            ],
            columns: [
                {
                    name: 'custrecord_ps_cer_buying_rate'
                },
                {
                    name: 'custrecord_ps_cer_effective_date',
                    sort: search.Sort.DESC
                }
            ]
        });

        const searchResults = exchangeRateSearch.run().getRange({
            start: 0,
            end: 1
        });

        if (searchResults.length > 0) {
            return searchResults[0].getValue({ name: 'custrecord_ps_cer_buying_rate' });
        } else {
            return null;
        }
    }

    function getSellingExchangeRate(currency, trandate) {
        const formattedTrandate = moment(trandate).format('D/MM/YYYY');
        const exchangeRateSearch = search.create({
            type: 'customrecord_ps_cust_exchange_rate',
            filters: [
                ['custrecord_ps_cer_source_currency', 'is', currency],
                'AND',
                ['custrecord_ps_cer_effective_date', 'onorbefore', formattedTrandate]
            ],
            columns: [
                {
                    name: 'custrecord_ps_cer_selling_rate'
                },
                {
                    name: 'custrecord_ps_cer_effective_date',
                    sort: search.Sort.DESC
                }
            ]
        });

        const searchResults = exchangeRateSearch.run().getRange({
            start: 0,
            end: 1
        });

        if (searchResults.length > 0) {
            return searchResults[0].getValue({ name: 'custrecord_ps_cer_selling_rate' });
        } else {
            return null;
        }
    }

    return {
        beforeSubmit: beforeSubmit
    };
});
