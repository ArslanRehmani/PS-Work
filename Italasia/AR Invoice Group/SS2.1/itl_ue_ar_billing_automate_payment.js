/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N', './itl_lib_constants_userevent.js'], (N, libConstants) => {

    const
        INVOICE = libConstants.INVOICE,
        CREDIT_MEMO = libConstants.CREDIT_MEMO,
        CUSTOMER_PAYMENT = libConstants.CUSTOMER_PAYMENT,
        AR_BILLING_NOTE_RECORD = libConstants.AR_BILLING_NOTE_RECORD;

    function beforeLoad(context) {
        try{
            log.debug('Executing...', 'Executing Before Load()');

            if(['create', 'copy'].includes(context.type))
                populateARBillingNoteReferenceFromURL(context);
        }
        catch(err){
            log.error('ERR! Found In beforeLoad()', err);
        }
    }
    
    function afterSubmit(ctx) {
        try{
            log.debug('Executing...', 'Executing After Submit()');
            
            if(['create', 'copy'].includes(ctx.type)){
                putPaymentReferenceOnARBillingNoteRecord(ctx);
                onApprovalUpdateARBillingNote(ctx);
            }
            else if(['edit'].includes(ctx.type)){
                onApprovalUpdateARBillingNote(ctx);
            }
                
        }
        catch(err){
            log.error('ERR! Found In afterSubmit()', err);
        }
    }

    function putPaymentReferenceOnARBillingNoteRecord(ctx){
        try{
            let
                newPayment = ctx.newRecord,
                arBillingNoteReference = newPayment.getValue(CUSTOMER_PAYMENT.fields.arBillingNoteReference.id);

            log.debug('arBillingNoteReference', arBillingNoteReference);

            // Handle both array and single value
            let arBillingNoteId = null;
            
            if(arBillingNoteReference){
                if(Array.isArray(arBillingNoteReference) && arBillingNoteReference.length > 0){
                    arBillingNoteId = arBillingNoteReference[0];
                } 
                else if(!Array.isArray(arBillingNoteReference)){
                    arBillingNoteId = arBillingNoteReference;
                }
            }

            if(arBillingNoteId){
                N.record.submitFields({
                    type: AR_BILLING_NOTE_RECORD.recordType,
                    id: arBillingNoteId,
                    values: {
                        [AR_BILLING_NOTE_RECORD.fields.customerPaymentReference.id]: newPayment.id
                    }
                });
                
                log.audit('Payment Reference Updated', {
                    arBillingNoteId: arBillingNoteId,
                    paymentId: newPayment.id,
                    fieldUpdated: AR_BILLING_NOTE_RECORD.fields.customerPaymentReference.id
                });
            }
            else {
                log.debug('No AR Billing Note Reference', 'Field is empty');
            }
        }   
        catch(err){
            log.error('ERR! Found In putPaymentReferenceOnARBillingNoteRecord()', err);
        }
    }

    function populateARBillingNoteReferenceFromURL(ctx){
        try{
            let
                newPayment = ctx.newRecord,
                request = ctx.request,
                parameters = request.parameters,
                arBillingNoteReference = parameters['arbillnote'];

            log.debug('URL Parameter arbillnote', arBillingNoteReference);

            if(arBillingNoteReference){
                newPayment.setValue({
                    fieldId: CUSTOMER_PAYMENT.fields.arBillingNoteReference.id,
                    value: parseInt(arBillingNoteReference)
                });
                
                log.audit('AR Billing Note Set From URL', {
                    arBillingNoteId: arBillingNoteReference,
                    fieldId: CUSTOMER_PAYMENT.fields.arBillingNoteReference.id
                });
            }
        }
        catch(err){
            log.error('ERR! Found In populateARBillingNoteReferenceFromURL()', err);
        }
    }

    function onApprovalUpdateARBillingNote(ctx){
        try{
            let
                newPayment = ctx.newRecord,
                arBillingNoteReference = newPayment.getValue(CUSTOMER_PAYMENT.fields.arBillingNoteReference.id);

            log.debug('{arBillingNoteReference}', {arBillingNoteReference});

            // Handle both array and single value
            let arBillingNoteId = null;
            
            if(arBillingNoteReference){
                if(Array.isArray(arBillingNoteReference) && arBillingNoteReference.length > 0){
                    arBillingNoteId = arBillingNoteReference[0];
                } 
                else if(!Array.isArray(arBillingNoteReference)){
                    arBillingNoteId = arBillingNoteReference;
                }
            }

            if(!arBillingNoteId){
                log.debug('No AR Billing Note to Update', 'Reference field is empty');
                return;
            }

            let arBillNote = N.record.load({
                type: AR_BILLING_NOTE_RECORD.recordType, 
                id: arBillingNoteId
            });

            let lineCount = arBillNote.getLineCount({ 
                sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id 
            });

            log.debug('AR Billing Note Lines', lineCount);

            for(let arBillLineNo = 0; arBillLineNo < lineCount; arBillLineNo++){
                let 
                    transactionId = arBillNote.getSublistValue({
                        sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                        fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.documentNumber.id,
                        line: arBillLineNo
                    }),
                    transactionType = arBillNote.getSublistValue({
                        sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                        fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.type.id,
                        line: arBillLineNo
                    });

                log.debug('{transactionId, transactionType, arBillLineNo}', {
                    transactionId, 
                    transactionType, 
                    arBillLineNo
                });

                // Process Invoice
                if(transactionType == AR_BILLING_NOTE_RECORD.defaults.transactionType.INVOICE){
                    try{
                        let invoiceLineNo = newPayment.findSublistLineWithValue({
                            sublistId: CUSTOMER_PAYMENT.sublists.APPLY.type,
                            fieldId: CUSTOMER_PAYMENT.sublists.APPLY.fields.internalId.id,
                            value: transactionId
                        });

                        if(invoiceLineNo === -1){
                            log.debug('Invoice Not Found in Apply Tab', transactionId);
                            continue;
                        }

                        let internalId = newPayment.getSublistValue({
                            sublistId: CUSTOMER_PAYMENT.sublists.APPLY.type,
                            fieldId: CUSTOMER_PAYMENT.sublists.APPLY.fields.internalId.id,
                            line: invoiceLineNo
                        });

                        let invoiceStatus = N.search.lookupFields({
                            type: INVOICE.recordType,
                            id: internalId,
                            columns: [INVOICE.fields.status.id]
                        })?.[INVOICE.fields.status.id]?.[0]?.text;

                        log.debug('{invoiceLineNo, internalId, invoiceStatus}', {
                            invoiceLineNo, 
                            internalId, 
                            invoiceStatus
                        });

                        // Only update status if status field exists in constants
                        if(AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.status){
                            if(invoiceStatus == INVOICE.defaults.status.PAID_IN_FULL){
                                arBillNote.setSublistText({
                                    sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                                    fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.status.id,
                                    line: arBillLineNo,
                                    text: AR_BILLING_NOTE_RECORD.defaults.status.INVOICE_PAID_IN_FULL
                                });
                            }
                            else{
                                arBillNote.setSublistText({
                                    sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                                    fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.status.id,
                                    line: arBillLineNo,
                                    text: AR_BILLING_NOTE_RECORD.defaults.status.INVOICE_OPEN
                                });
                            }
                        }
                    }
                    catch(invoiceErr){
                        log.error('Error Processing Invoice', {
                            transactionId,
                            error: invoiceErr.message
                        });
                    }
                }
                // Process Credit Memo
                else if(transactionType == AR_BILLING_NOTE_RECORD.defaults.transactionType.CREDIT_MEMO){
                    try{
                        let creditLineNo = newPayment.findSublistLineWithValue({
                            sublistId: CUSTOMER_PAYMENT.sublists.CREDIT.type,
                            fieldId: CUSTOMER_PAYMENT.sublists.CREDIT.fields.internalId.id,
                            value: transactionId
                        });

                        if(creditLineNo === -1){
                            log.debug('Credit Memo Not Found in Credit Tab', transactionId);
                            continue;
                        }

                        let internalId = newPayment.getSublistValue({
                            sublistId: CUSTOMER_PAYMENT.sublists.CREDIT.type,
                            fieldId: CUSTOMER_PAYMENT.sublists.CREDIT.fields.internalId.id,
                            line: creditLineNo
                        });

                        let creditMemoStatus = N.search.lookupFields({
                            type: CREDIT_MEMO.recordType,
                            id: internalId,
                            columns: [CREDIT_MEMO.fields.status.id]
                        })?.[CREDIT_MEMO.fields.status.id]?.[0]?.text;

                        log.debug('{creditLineNo, internalId, creditMemoStatus}', {
                            creditLineNo, 
                            internalId, 
                            creditMemoStatus
                        });

                        // Only update status if status field exists in constants
                        if(AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.status){
                            if(creditMemoStatus == CREDIT_MEMO.defaults.status.FULLY_APPLIED){
                                arBillNote.setSublistText({
                                    sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                                    fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.status.id,
                                    line: arBillLineNo,
                                    text: AR_BILLING_NOTE_RECORD.defaults.status.CREDITMEMO_FULLY_APPLIED
                                });
                            }
                            else{
                                arBillNote.setSublistText({
                                    sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                                    fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.status.id,
                                    line: arBillLineNo,
                                    text: AR_BILLING_NOTE_RECORD.defaults.status.CREDITMEMO_OPEN
                                });
                            }
                        }
                    }
                    catch(creditErr){
                        log.error('Error Processing Credit Memo', {
                            transactionId,
                            error: creditErr.message
                        });
                    }
                }
            }

            arBillNote.save();
            log.audit('AR Billing Note Updated', arBillingNoteId);
        }
        catch(err){
            log.error('ERR! Found In onApprovalUpdateARBillingNote()', err);
        }
    }

    return {
        beforeLoad: beforeLoad,
        afterSubmit: afterSubmit
    };
});

// /**
//  * @NApiVersion 2.1
//  * @NScriptType UserEventScript
//  * @NModuleScope SameAccount
//  */
// define(['N', './itl_lib_constants_userevent.js'], (N, libConstants) => {

//     const
//         INVOICE = libConstants.INVOICE,
//         CREDIT_MEMO = libConstants.CREDIT_MEMO,
//         CUSTOMER_PAYMENT = libConstants.CUSTOMER_PAYMENT,
//         AR_BILLING_NOTE_RECORD = libConstants.AR_BILLING_NOTE_RECORD;

//     function beforeLoad(context) {
//         try{
//             log.debug('Executing...', 'Executing Before Load()');

//             if(['create', 'copy'].includes(context.type))
//                 populateARBillingNoteReferenceFromURL(context);
//         }
//         catch(err){
//             log.error('ERR! Found In beforeLoad()', err);
//         }
//     }
    
//     function afterSubmit(ctx) {
//         try{
//             log.debug('Executing...', 'Executing After Submit()');
            
//             if(['create', 'copy'].includes(ctx.type)){
//                 putPaymentReferenceOnARBillingNoteRecord(ctx);
//                 onApprovalUpdateARBillingNote(ctx);
//             }
//             else if(['edit'].includes(ctx.type)){
//                 onApprovalUpdateARBillingNote(ctx);
//             }
                
//         }
//         catch(err){
//             log.error('ERR! Found In afterSubmit()', err);
//         }
//     }

//     function putPaymentReferenceOnARBillingNoteRecord(ctx){
//         try{
//             let
//                 newPayment = ctx.newRecord,
//                 arBillingNoteReference = newPayment.getValue(CUSTOMER_PAYMENT.fields.arBillingNoteReference.id);

//             log.debug('arBillingNoteReference', arBillingNoteReference);

//             // Check if field has value and is array
//             if(arBillingNoteReference && Array.isArray(arBillingNoteReference) && arBillingNoteReference.length > 0){
//                 N.record.submitFields({
//                     type: AR_BILLING_NOTE_RECORD.recordType,
//                     id: arBillingNoteReference[0],
//                     values: {
//                         [AR_BILLING_NOTE_RECORD.fields.customerPaymentReference.id]: newPayment.id
//                     }
//                 });
                
//                 log.audit('Payment Reference Updated', {
//                     arBillingNoteId: arBillingNoteReference[0],
//                     paymentId: newPayment.id
//                 });
//             }
//             else {
//                 log.debug('No AR Billing Note Reference', 'Field is empty or not an array');
//             }
//         }   
//         catch(err){
//             log.error('ERR! Found In putPaymentReferenceOnARBillingNoteRecord()', err);
//         }
//     }

//     function populateARBillingNoteReferenceFromURL(ctx){
//         try{
//             let
//                 newPayment = ctx.newRecord,
//                 request = ctx.request,
//                 parameters = request.parameters,
//                 arBillingNoteReference = parameters['arbillnote'];

//             log.debug('URL Parameter arbillnote', arBillingNoteReference);

//             if(arBillingNoteReference){
//                 newPayment.setValue({
//                     fieldId: CUSTOMER_PAYMENT.fields.arBillingNoteReference.id,
//                     value: [arBillingNoteReference]
//                 });
                
//                 log.audit('AR Billing Note Set From URL', {
//                     arBillingNoteId: arBillingNoteReference,
//                     fieldId: CUSTOMER_PAYMENT.fields.arBillingNoteReference.id
//                 });
//             }
//         }
//         catch(err){
//             log.error('ERR! Found In populateARBillingNoteReferenceFromURL()', err);
//         }
//     }

//     function onApprovalUpdateARBillingNote(ctx){
//         try{
//             let
//                 newPayment = ctx.newRecord,
//                 arBillingNoteReference = newPayment.getValue(CUSTOMER_PAYMENT.fields.arBillingNoteReference.id);

//             log.debug('{arBillingNoteReference}', {arBillingNoteReference});

//             // Check if reference exists and is array
//             if(!arBillingNoteReference || !Array.isArray(arBillingNoteReference) || arBillingNoteReference.length === 0){
//                 log.debug('No AR Billing Note to Update', 'Reference field is empty');
//                 return;
//             }

//             let arBillNote = N.record.load({
//                 type: AR_BILLING_NOTE_RECORD.recordType, 
//                 id: arBillingNoteReference[0]
//             });

//             let lineCount = arBillNote.getLineCount({ 
//                 sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id 
//             });

//             log.debug('AR Billing Note Lines', lineCount);

//             for(let arBillLineNo = 0; arBillLineNo < lineCount; arBillLineNo++){
//                 let 
//                     transactionId = arBillNote.getSublistValue({
//                         sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
//                         fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.documentNumber.id,
//                         line: arBillLineNo
//                     }),
//                     transactionType = arBillNote.getSublistValue({
//                         sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
//                         fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.type.id,
//                         line: arBillLineNo
//                     });

//                 log.debug('{transactionId, transactionType, arBillLineNo}', {
//                     transactionId, 
//                     transactionType, 
//                     arBillLineNo
//                 });

//                 // Process Invoice
//                 if(transactionType == AR_BILLING_NOTE_RECORD.defaults.transactionType.INVOICE){
//                     try{
//                         let invoiceLineNo = newPayment.findSublistLineWithValue({
//                             sublistId: CUSTOMER_PAYMENT.sublists.APPLY.type,
//                             fieldId: CUSTOMER_PAYMENT.sublists.APPLY.fields.internalId.id,
//                             value: transactionId
//                         });

//                         if(invoiceLineNo === -1){
//                             log.debug('Invoice Not Found in Apply Tab', transactionId);
//                             continue;
//                         }

//                         let internalId = newPayment.getSublistValue({
//                             sublistId: CUSTOMER_PAYMENT.sublists.APPLY.type,
//                             fieldId: CUSTOMER_PAYMENT.sublists.APPLY.fields.internalId.id,
//                             line: invoiceLineNo
//                         });

//                         let invoiceStatus = N.search.lookupFields({
//                             type: INVOICE.recordType,
//                             id: internalId,
//                             columns: [INVOICE.fields.status.id]
//                         })?.[INVOICE.fields.status.id]?.[0]?.text;

//                         log.debug('{invoiceLineNo, internalId, invoiceStatus}', {
//                             invoiceLineNo, 
//                             internalId, 
//                             invoiceStatus
//                         });

//                         // Only update status if status field exists in constants
//                         if(AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.status){
//                             if(invoiceStatus == INVOICE.defaults.status.PAID_IN_FULL){
//                                 arBillNote.setSublistText({
//                                     sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
//                                     fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.status.id,
//                                     line: arBillLineNo,
//                                     text: AR_BILLING_NOTE_RECORD.defaults.status.INVOICE_PAID_IN_FULL
//                                 });
//                             }
//                             else{
//                                 arBillNote.setSublistText({
//                                     sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
//                                     fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.status.id,
//                                     line: arBillLineNo,
//                                     text: AR_BILLING_NOTE_RECORD.defaults.status.INVOICE_OPEN
//                                 });
//                             }
//                         }
//                     }
//                     catch(invoiceErr){
//                         log.error('Error Processing Invoice', {
//                             transactionId,
//                             error: invoiceErr.message
//                         });
//                     }
//                 }
//                 // Process Credit Memo
//                 else if(transactionType == AR_BILLING_NOTE_RECORD.defaults.transactionType.CREDIT_MEMO){
//                     try{
//                         let creditLineNo = newPayment.findSublistLineWithValue({
//                             sublistId: CUSTOMER_PAYMENT.sublists.CREDIT.type,
//                             fieldId: CUSTOMER_PAYMENT.sublists.CREDIT.fields.internalId.id,
//                             value: transactionId
//                         });

//                         if(creditLineNo === -1){
//                             log.debug('Credit Memo Not Found in Credit Tab', transactionId);
//                             continue;
//                         }

//                         let internalId = newPayment.getSublistValue({
//                             sublistId: CUSTOMER_PAYMENT.sublists.CREDIT.type,
//                             fieldId: CUSTOMER_PAYMENT.sublists.CREDIT.fields.internalId.id,
//                             line: creditLineNo
//                         });

//                         let creditMemoStatus = N.search.lookupFields({
//                             type: CREDIT_MEMO.recordType,
//                             id: internalId,
//                             columns: [CREDIT_MEMO.fields.status.id]
//                         })?.[CREDIT_MEMO.fields.status.id]?.[0]?.text;

//                         log.debug('{creditLineNo, internalId, creditMemoStatus}', {
//                             creditLineNo, 
//                             internalId, 
//                             creditMemoStatus
//                         });

//                         // Only update status if status field exists in constants
//                         if(AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.status){
//                             if(creditMemoStatus == CREDIT_MEMO.defaults.status.FULLY_APPLIED){
//                                 arBillNote.setSublistText({
//                                     sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
//                                     fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.status.id,
//                                     line: arBillLineNo,
//                                     text: AR_BILLING_NOTE_RECORD.defaults.status.CREDITMEMO_FULLY_APPLIED
//                                 });
//                             }
//                             else{
//                                 arBillNote.setSublistText({
//                                     sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
//                                     fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.status.id,
//                                     line: arBillLineNo,
//                                     text: AR_BILLING_NOTE_RECORD.defaults.status.CREDITMEMO_OPEN
//                                 });
//                             }
//                         }
//                     }
//                     catch(creditErr){
//                         log.error('Error Processing Credit Memo', {
//                             transactionId,
//                             error: creditErr.message
//                         });
//                     }
//                 }
//             }

//             arBillNote.save();
//             log.audit('AR Billing Note Updated', arBillingNoteReference[0]);
//         }
//         catch(err){
//             log.error('ERR! Found In onApprovalUpdateARBillingNote()', err);
//         }
//     }

//     return {
//         beforeLoad: beforeLoad,
//         afterSubmit: afterSubmit
//     };
// });