/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/log'], function(currentRecord, log) {
    
    const postSourcing = (context) => {
        try {
            var record = context.currentRecord;
            var sublistId = context.sublistId;
            var fieldId = context.fieldId;
            
            if (sublistId !== 'item') return;
            
            var priceIncludeVat = record.getValue({
                fieldId: 'custbody_ps_shm_price_include_vat'
            });
            
            if (!priceIncludeVat) return;

          var priceVal = record.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'price'
                });
          console.log('priceVal',priceVal);
          console.log('priceVal type',typeof priceVal);
            
            if (fieldId === 'item' || fieldId === 'price') {
               console.log('TEST123');
                
                var standardRate = record.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate'
                });
                
                record.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ps_shm_rate_include_vat',
                    value: standardRate || 0
                });
                
                calculateStandardRate(record);
            }
            
            if (fieldId === 'taxcode') {
                calculateStandardRate(record);
            }
            
        } catch (e) {
            log.error('postSourcing Error', e.toString());
        }
    }
    
    const fieldChanged = (context) => {
        try {
            var record = context.currentRecord;
            var sublistId = context.sublistId;
            var fieldId = context.fieldId;
            
            if (sublistId === 'item' && fieldId === 'custcol_ps_shm_rate_include_vat') {
                
                var priceIncludeVat = record.getValue({
                    fieldId: 'custbody_ps_shm_price_include_vat'
                });
                
                if (priceIncludeVat) {
                    calculateStandardRate(record);
                }
            }
            
        } catch (e) {
            log.error('fieldChanged Error', e.toString());
        }
    }
    
    const calculateStandardRate = (record) => {
      console.log('TEST');
        try {
            
            var customRate = record.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_ps_shm_rate_include_vat'
            });
            
            if (!customRate || customRate === 0) {
                return;
            }
            
            var taxRate = record.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'taxrate1'
            }) || 0;
            
            var standardRate = customRate / (1 + (taxRate / 100));
            standardRate = Math.round(standardRate * 100) / 100;
    
            log.debug('calculateStandardRate', 'Custom Rate: ' + customRate + ', Tax Rate: ' + taxRate + '% → Standard Rate: ' + standardRate);
            
            record.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: standardRate
            });
            
        } catch (e) {
            log.error('calculateStandardRate Error', e.toString());
        }
    }   
    return {
        postSourcing: postSourcing,
        fieldChanged: fieldChanged
    };
    
});