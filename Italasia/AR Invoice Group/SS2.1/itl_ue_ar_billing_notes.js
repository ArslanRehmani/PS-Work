/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N', './itl_lib_constants_userevent.js'], (N, libConstants) => {
    const 
        CUSTOMER_PAYMENT       = libConstants.CUSTOMER_PAYMENT,
        AR_BILLING_NOTE_RECORD = libConstants.AR_BILLING_NOTE_RECORD,
        
        beforeLoad = (context) => {
            try{
                if(context.type == 'create')
                    N.redirect.toSuitelet({
                        scriptId: AR_BILLING_NOTE_RECORD.suiteletScript.scriptId,
                        deploymentId: AR_BILLING_NOTE_RECORD.suiteletScript.deploymentId,
                    })
                if(context.type == 'view'){
                    let 
                        newARBillingNote = context.newRecord,
                        arBillingNoteForm = context.form,
                        customerPaymentReference = newARBillingNote.getValue(AR_BILLING_NOTE_RECORD.fields.customerPaymentReference.id);
                    if(!customerPaymentReference){
                        attachListnerToCustomButtons(context);
                        Object.values(AR_BILLING_NOTE_RECORD.customButtons).forEach(button => { arBillingNoteForm.addButton(button) });
                    }
                }
            }
            catch(err){
                log.debug('ERR# Found In beforeLoad()', err);
            }
        };
        
    function attachListnerToCustomButtons(context){
        try{
            let 
                arBillingNoteData = new Object(),
                newARBillingNote = context.newRecord,
                arBillingNoteURL = "https://" +
                    N.url.resolveDomain({
                        hostType: N.url.HostType.APPLICATION
                    }) + N.url.resolveRecord({
                        recordType: CUSTOMER_PAYMENT.recordType
                    });
                
            Object.values(AR_BILLING_NOTE_RECORD.fields).forEach(field => {
                arBillingNoteData[field.id] = newARBillingNote.getValue(field.id)
            });
            log.debug('{arBillingNoteData, arBillingNoteURL}', {arBillingNoteData, arBillingNoteURL});

            AR_BILLING_NOTE_RECORD.customButtons.acceptPayment.functionName = ` 
                var arBillingNoteSearchParam = new URLSearchParams('${arBillingNoteURL}')
                arBillingNoteSearchParam.set("entity", ${arBillingNoteData[AR_BILLING_NOTE_RECORD.fields.customer.id]})
                arBillingNoteSearchParam.set("currency", ${arBillingNoteData[AR_BILLING_NOTE_RECORD.fields.currency.id]})
                arBillingNoteSearchParam.set("arbillnote", ${newARBillingNote.id})
                arBillingNoteURL = decodeURIComponent(arBillingNoteSearchParam.toString())
                console.log("{arBillingNoteURL}", {arBillingNoteURL})
                window.open(arBillingNoteURL,'_self') 
            `;
        }
        catch(err){
            log.debug('ERR! Found In attachListnerToCustomButtons()', err)
        }
    }
    
    return { beforeLoad };
});