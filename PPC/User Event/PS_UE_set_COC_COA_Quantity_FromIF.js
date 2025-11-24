/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log'], function(record, log) {

    function afterSubmit(context) {
        try {
            var coc_CoaRecord = context.newRecord;
            var IFNumber = coc_CoaRecord.getValue({
                fieldId: 'custrecord_coccoa_deliverydocket'
            }); 
            var loadedFulfillment = record.load({
                type: record.Type.ITEM_FULFILLMENT,
                id: IFNumber
            });
            var totalQuantity = 0;
            var lineCount = loadedFulfillment.getLineCount({
                sublistId: 'item'
            });
            for (var i = 0; i < lineCount; i++) {
                var quantity = loadedFulfillment.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i
                });

                totalQuantity += quantity;
            }
            log.debug('totalQuantity', totalQuantity)
            log.debug('recordType', coc_CoaRecord.type)
            log.debug('recordId', coc_CoaRecord.id)
            // record.submitFields({
            //     type: coc_CoaRecord.type,
            //     id: coc_CoaRecord.id,
            //     values: {
            //         custrecord_coccoa_deliveryqty : totalQuantity
            //     }
            // });
            
           var cocRecord = record.load({
                type: "customrecord_coc_coa",
                id: coc_CoaRecord.id
               // isDynamic : true
            });
            cocRecord.setValue({
                fieldId: 'custrecord_coccoa_qty',
                value: totalQuantity
            });
            var recordId = cocRecord.save({
                enableSourcing: true,
               ignoreMandatoryFields: true
            });
            log.debug('recId', recordId)
        } catch (e) {
            log.error({
                title: 'Error in After Submit Script',
                details: e
            });
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});
