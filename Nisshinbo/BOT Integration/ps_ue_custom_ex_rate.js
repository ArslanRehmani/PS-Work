/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log', 'N/search', './moment.js', 'N/runtime'], 
    function(record, log, search, moment, runtime) {   

    function beforeLoad(context) {
        
    }

    function beforeSubmit(context) {
      

        const newRecord = context.newRecord;
        const oldRecord = context.oldRecord || null;
        const recordType = newRecord.type;
        if (recordType !== 'customrecord_ps_cust_exchange_rate') {
            return;
        }

        let oldSourceCurrency = null;
        const sourceCurrency = newRecord.getValue({ fieldId: 'custrecord_ps_cer_source_currency' });
        const effectiveDate = newRecord.getValue({ fieldId: 'custrecord_ps_cer_effective_date' });

        if (oldRecord) {
            oldSourceCurrency = oldRecord.getValue({ fieldId: 'custrecord_ps_cer_source_currency' });
        }

        if (sourceCurrency !== oldSourceCurrency) {
            const recordExists = searchCustomExchangeRateRecordExists(sourceCurrency, effectiveDate);
            log.debug('Record Exists', recordExists);
            if (recordExists) {
                throw 'A record with the same source currency already exists';
            }
        }
    }

    function afterSubmit(context) {
    }

    function searchCustomExchangeRateRecordExists(sourceCurrency, effectiveDate) {
        const formattedEffectiveDate = moment(effectiveDate).format('D/MM/YYYY');
        var customExchangeRateSearch = search.create({
            type: 'customrecord_ps_cust_exchange_rate',
            filters: [
                ['custrecord_ps_cer_source_currency', 'is', sourceCurrency],
                'AND',
                ['custrecord_ps_cer_effective_date', 'on', formattedEffectiveDate]
            ],
            columns: []
        });

        var searchResults = customExchangeRateSearch.run().getRange({
            start: 0,
            end: 1
        });

        if (searchResults.length > 0) {
            return true;
        } else {
            return false;
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
});