/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

define(['N', './itl_lib_constants_userevent.js'], (N, libConstants) => {

    const
        TRANSACTION            = libConstants.TRANSACTION,
        CUSTOMER_PAYMENT       = libConstants.CUSTOMER_PAYMENT,
        AR_BILLING_NOTE_RECORD = libConstants.AR_BILLING_NOTE_RECORD;

    function pageInit(ctx) {
        try{
            console.log('Page Init - Starting...');
            
            setARBillingNoteFromURL(ctx);
            
            autoApplyTransactionsBasedOnARBillingNoteRef(ctx);
        }
        catch(err){
            console.error('ERR! Found In pageInit()', err);
            log.error('ERR! Found In pageInit()', err);
        }
    }

    function validateField(ctx) {
        try{
            return true;
        }   
        catch(err){
            console.error('ERR! Found In validateField()', err);
            log.error('ERR! Found In validateField()', err);
            return true;
        }
    }

    function setARBillingNoteFromURL(ctx){
        try{
            console.log('Setting AR Billing Note from URL...');
            
            let currentPayment = ctx.currentRecord;
            
            // Get URL parameters
            let urlParams = new URLSearchParams(window.location.search);
            let arBillingNoteId = urlParams.get('arbillnote');
            
            console.log('AR Billing Note ID from URL:', arBillingNoteId);
            
            if(arBillingNoteId){
                currentPayment.setValue({
                    fieldId: CUSTOMER_PAYMENT.fields.arBillingNoteReference.id,
                    value: parseInt(arBillingNoteId)
                });
                
                console.log('AR Billing Note field set successfully:', arBillingNoteId);
            }
        }
        catch(err){
            console.error('ERR! Found In setARBillingNoteFromURL()', err);
            log.error('ERR! Found In setARBillingNoteFromURL()', err);
        }
    }

    function autoApplyTransactionsBasedOnARBillingNoteRef(ctx){
        try{
            console.log('Running autoApplyTransactionsBasedOnARBillingNoteRef()');
            
            let currentPayment = ctx.currentRecord;
            let arBillingNoteReference = currentPayment.getValue({
                fieldId: CUSTOMER_PAYMENT.fields.arBillingNoteReference.id
            });
            
            console.log('AR Billing Note Reference:', arBillingNoteReference);

            if(!arBillingNoteReference){
                console.log('No AR Billing Note Reference found');
                return;
            }

            let arBillingNoteId = Array.isArray(arBillingNoteReference) ? 
                arBillingNoteReference[0] : arBillingNoteReference;

            if(!arBillingNoteId){
                console.log('AR Billing Note ID is empty');
                return;
            }

            console.log('Loading AR Billing Note:', arBillingNoteId);

            let arBillingNote = N.record.load({
                type: AR_BILLING_NOTE_RECORD.recordType, 
                id: arBillingNoteId
            });

            let lineCount = arBillingNote.getLineCount({ 
                sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id 
            });

            console.log('AR Billing Note Lines:', lineCount);

            for(let arBillLineNo = 0; arBillLineNo < lineCount; arBillLineNo++){
                
                let transactionId = arBillingNote.getSublistValue({
                    sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                    fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.documentNumber.id,
                    line: arBillLineNo
                });

                let transactionType = arBillingNote.getSublistValue({
                    sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                    fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.type.id,
                    line: arBillLineNo
                });

                let billingAmount = arBillingNote.getSublistValue({
                    sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                    fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.billingAmount.id,
                    line: arBillLineNo
                });

                console.log('Processing Transaction:', {
                    transactionId, 
                    transactionType, 
                    billingAmount,
                    line: arBillLineNo
                });

                // Process Invoice
                if(transactionType == AR_BILLING_NOTE_RECORD.defaults.transactionType.INVOICE){
                    try{
                        let invoiceLineNo = currentPayment.findSublistLineWithValue({
                            sublistId: CUSTOMER_PAYMENT.sublists.APPLY.type,
                            fieldId: CUSTOMER_PAYMENT.sublists.APPLY.fields.internalId.id,
                            value: transactionId
                        });

                        if(invoiceLineNo === -1){
                            console.log('Invoice not found in Apply tab:', transactionId);
                            continue;
                        }

                        console.log('Found Invoice at line:', invoiceLineNo);

                        currentPayment.selectLine({
                            sublistId: CUSTOMER_PAYMENT.sublists.APPLY.type,
                            line: invoiceLineNo
                        });

                        currentPayment.setCurrentSublistValue({
                            sublistId: CUSTOMER_PAYMENT.sublists.APPLY.type,
                            fieldId: CUSTOMER_PAYMENT.sublists.APPLY.fields.amount.id,
                            value: billingAmount
                        });

                        currentPayment.setCurrentSublistValue({
                            sublistId: CUSTOMER_PAYMENT.sublists.APPLY.type,
                            fieldId: CUSTOMER_PAYMENT.sublists.APPLY.fields.apply.id,
                            value: true
                        });

                        currentPayment.commitLine({
                            sublistId: CUSTOMER_PAYMENT.sublists.APPLY.type
                        });

                        console.log('Invoice applied successfully:', transactionId);
                    }
                    catch(invoiceErr){
                        console.error('Error applying invoice:', invoiceErr);
                    }
                }
                // Process Credit Memo
                else if(transactionType == AR_BILLING_NOTE_RECORD.defaults.transactionType.CREDIT_MEMO){
                    try{
                        let creditLineNo = currentPayment.findSublistLineWithValue({
                            sublistId: CUSTOMER_PAYMENT.sublists.CREDIT.type,
                            fieldId: CUSTOMER_PAYMENT.sublists.CREDIT.fields.internalId.id,
                            value: transactionId
                        });

                        if(creditLineNo === -1){
                            console.log('Credit Memo not found in Credit tab:', transactionId);
                            continue;
                        }

                        console.log('Found Credit Memo at line:', creditLineNo);

                        currentPayment.selectLine({
                            sublistId: CUSTOMER_PAYMENT.sublists.CREDIT.type,
                            line: creditLineNo
                        });

                        currentPayment.setCurrentSublistValue({
                            sublistId: CUSTOMER_PAYMENT.sublists.CREDIT.type,
                            fieldId: CUSTOMER_PAYMENT.sublists.CREDIT.fields.amount.id,
                            value: billingAmount
                        });

                        currentPayment.setCurrentSublistValue({
                            sublistId: CUSTOMER_PAYMENT.sublists.CREDIT.type,
                            fieldId: CUSTOMER_PAYMENT.sublists.CREDIT.fields.apply.id,
                            value: true
                        });

                        currentPayment.commitLine({
                            sublistId: CUSTOMER_PAYMENT.sublists.CREDIT.type
                        });

                        console.log('Credit Memo applied successfully:', transactionId);
                    }
                    catch(creditErr){
                        console.error('Error applying credit memo:', creditErr);
                    }
                }
            }

            console.log('Auto-apply completed successfully');
        }
        catch(err){
            console.error('ERR! Found In autoApplyTransactionsBasedOnARBillingNoteRef()', err);
            log.error('ERR! Found In autoApplyTransactionsBasedOnARBillingNoteRef()', err);
        }
    }

    return {
        pageInit: pageInit,
        validateField: validateField
    };
});