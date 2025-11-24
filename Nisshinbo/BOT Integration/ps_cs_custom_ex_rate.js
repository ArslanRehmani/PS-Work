/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/record', 'N/log', 'N/search', './moment.js', './ps_bot_constants'], 
    function(record, log, search, moment, CONSTANTS) {  

    function pageInit(context) {
        // const recordType = context.currentRecord.type;
        // const onCreate = context.mode === 'create';
        // const onEdit = context.mode === 'edit';
        // const exchangeRateMap = CONSTANTS.TRANSACTION_EXCHANGE_RATE_MAP;
        // const currency = context.currentRecord.getValue({fieldId: 'currency'});
        // log.debug('Currency', currency);

        // if(!onCreate) return;
        // if(currency == CONSTANTS.BASE_CURRENCY){
        //     return;
        // } else {
        //     log.debug('Record Type', recordType);
        //     log.debug('Exchange Rate Map', exchangeRateMap);
        //     if(exchangeRateMap.buying_rate.indexOf(recordType) > -1){
        //         const exchangeRate = getBuyingExchangeRate(currency);
        //         context.currentRecord.setValue({fieldId: 'exchangerate', value: exchangeRate});
        //     } else if(exchangeRateMap.selling_rate.indexOf(recordType) > -1){   
        //         const exchangeRate = getSellingExchangeRate(currency);
        //         context.currentRecord.setValue({fieldId: 'exchangerate', value: exchangeRate});
        //     }
        // }
    }

    function getBuyingExchangeRate(currency, trandate){
        const formattedTrandate = moment(trandate).format('D/MM/YYYY');
        var exchangeRateSearch = search.create({ 
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
        var searchResults = exchangeRateSearch.run().getRange({
            start: 0,
            end: 1
        });
        if (searchResults.length > 0) {
            return searchResults[0].getValue({name: 'custrecord_ps_cer_buying_rate'});
        } else {
            return null;
        }
    }

    function getSellingExchangeRate(currency, trandate){
        const formattedTrandate = moment(trandate).format('D/MM/YYYY');
        var exchangeRateSearch = search.create({
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

        var searchResults = exchangeRateSearch.run().getRange({
            start: 0,
            end: 1
        });

        if (searchResults.length > 0) {
            return searchResults[0].getValue({name: 'custrecord_ps_cer_selling_rate'});
        } else {
            return null;
        }
    }
    function postSourcing(context) {
            const fieldName = context.fieldId;
        log.debug('Field Name', fieldName);
        if(fieldName == 'currency' || fieldName == 'trandate') 
        {
            const recordType = context.currentRecord.type;
            const onCreate = context.mode === 'create';
            const onEdit = context.mode === 'edit';
            const exchangeRateMap = CONSTANTS.TRANSACTION_EXCHANGE_RATE_MAP;
            const currency = context.currentRecord.getValue({fieldId: 'currency'});
            const trandate = context.currentRecord.getValue({fieldId: 'trandate'});
            if(currency == CONSTANTS.BASE_CURRENCY){
                return;
            } else {
                if(exchangeRateMap.buying_rate.indexOf(recordType) > -1 && currency){
                    const exchangeRate = getBuyingExchangeRate(currency, trandate);
                    if(exchangeRate){
                        context.currentRecord.setValue({fieldId: 'exchangerate', value: exchangeRate});
                    }
                } else if(exchangeRateMap.selling_rate.indexOf(recordType) > -1 && currency){
                    const exchangeRate = getSellingExchangeRate(currency, trandate);
                    if(exchangeRate){
                        context.currentRecord.setValue({fieldId: 'exchangerate', value: exchangeRate});
                    }
                }
            }
        }
        
    }


    return {
        pageInit: pageInit,
        postSourcing: postSourcing
    };
});