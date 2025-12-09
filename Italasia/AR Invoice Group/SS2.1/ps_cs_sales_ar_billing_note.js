/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript   
*/
 define(['N', './itl_lib_constants_suitelet.js'],

    function(N, libConstants) {

        const
            UI = libConstants.UI;

        let transactionsAmount = new Object();
        
        function fieldChanged(ctx) {
            try{

                console.log({ctx});

                let
                    currentRecord = ctx.currentRecord; 
                    isCheckBoxMarked = currentRecord.getSublistValue({
                        sublistId: UI.sublists.transactions.id,
                        fieldId: UI.sublists.transactions.fields.checkBox.id,
                        line: ctx.line
                    }),
                    remainingAmount = currentRecord.getSublistValue({
                        sublistId: UI.sublists.transactions.id,
                        fieldId: UI.sublists.transactions.fields.remainingAmount.id,
                        line: ctx.line
                    }),
                    billingAmount = currentRecord.getSublistValue({
                        sublistId: UI.sublists.transactions.id,
                        fieldId: UI.sublists.transactions.fields.billingAmount.id,
                        line: ctx.line
                    }),
                    arBillingTotal = currentRecord.getSublistValue({
                        sublistId: UI.sublists.transactions.id,
                        fieldId: UI.sublists.transactions.fields.arBillingNoteTotal.id,
                        line: ctx.line
                    }),
                    totalAmount = currentRecord.getValue(UI.fields.totalAmount.id);

                console.log({isCheckBoxMarked, billingAmount, remainingAmount, arBillingTotal, totalAmount});

                if(!!isCheckBoxMarked && ctx.fieldId == UI.sublists.transactions.fields.checkBox.id){
                    totalAmount = Number(totalAmount || 0 ) + Number(billingAmount || 0 )
                    currentRecord.setValue({
                        fieldId: UI.fields.totalAmount.id,
                        value: totalAmount.toFixed(2)
                    })

                    transactionsAmount[ctx.line] = Number(billingAmount).toFixed(2);
                }
                else if(!isCheckBoxMarked && ctx.fieldId == UI.sublists.transactions.fields.checkBox.id && totalAmount != 0){
                    totalAmount = Number(totalAmount || 0 ) - Number(billingAmount || 0 )
                    currentRecord.setValue({
                        fieldId: UI.fields.totalAmount.id,
                        value: totalAmount.toFixed(2)
                    })

                }

                if(!!isCheckBoxMarked && ctx.fieldId == UI.sublists.transactions.fields.billingAmount.id){
  
                    totalAmount = Number(totalAmount || 0 ) - (transactionsAmount[ctx.line] || (Number(remainingAmount || 0 ) - Number(arBillingTotal || 0 ))) + Number(billingAmount || 0 )
                    currentRecord.setValue({
                        fieldId: UI.fields.totalAmount.id,
                        value: totalAmount.toFixed(2)
                    })

                    transactionsAmount[ctx.line] = Number(billingAmount).toFixed(2);  
                }


                if(ctx.fieldId == UI.sublists.transactions.fields.billingAmount.id && Number(billingAmount || 0 ) > (Number(remainingAmount || 0 ) - Number(arBillingTotal || 0 ))){
                    alert(`Please Note: Billing amount can not be greater than remaining amount.`)
                    currentRecord.setCurrentSublistValue({
                        sublistId: UI.sublists.transactions.id,
                        fieldId: UI.sublists.transactions.fields.billingAmount.id,
                        value: (Number(remainingAmount || 0 ) - Number(arBillingTotal || 0 ))
                    })
                }
            }
            catch(err){
                log.debug('ERR! Found In fieldChanged()', err);
                console.log('ERR! Found In fieldChanged()', err);

            }
        }

        function applyFilter(){
            try{
                let 
                    suiteletScriptURL = 'https://' + N.url.resolveDomain({
                        hostType: N.url.HostType.APPLICATION
                    }) + N.url.resolveScript({
                        scriptId: UI.scriptId,
                        deploymentId: UI.deploymentId
                    });

                window.onbeforeunload = null;
                var url       = suiteletScriptURL;
                var uiFilters = Object.values(UI.fields).filter(field => (field.id != UI.fields?.inlineHTML?.id && field.id != UI.fields?.totalAmount?.id));

                console.log('{url, uiFilters}', {url, uiFilters})
                
                uiFilters.forEach(function (uiFilter){
                    url = url.concat('&' + uiFilter.id + '=' + nlapiGetFieldValue(uiFilter.id))
                });

                window.open(url,'_self')
            }
            catch(err){
                log.debug('ERR! Found In applyFilter()', err);
            }
        }

        return {
                // lineInit: lineInit,
                // pageInit: pageInit,
                // postSourcing : postSourcing,
                // saveRecord : saveRecord,
                // sublistChanged : sublistChanged,
                // validateDelete : validateDelete,
                // validateField : validateField,
                // validateInsert : validateInsert,
                // validateLine : validateLine,
                applyFilter : applyFilter,
                fieldChanged : fieldChanged
            };
     }
);
