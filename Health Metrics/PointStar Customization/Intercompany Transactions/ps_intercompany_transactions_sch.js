/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/log', 'N/record', 'N/search'], function(log, record, search) {

    const CONSTANTS = {
        IC_CUSTOMER: 20,
        IC_VENDOR: 23,
        IC_INVOICE_ITEM: 432,
        IC_BILL_ITEM: 433,
        IC_ACCOUNT: 226,
        EXPENSE_ACCOUNT: 58
    };

    function execute(context) {
        try {
            log.debug('Scheduled Script', 'Script execution started');
            const {transactionsTotal, transactionIds} = getTransactionsToProcess();
            if(transactionsTotal > 0 && transactionIds.length > 0) {
                log.debug('transactionsTotal', transactionsTotal);
                log.debug('transactionIds', transactionIds);
                try{
                    const {invoiceId, billId} = createIntercompanyTransactions(transactionsTotal);
                    log.debug('Intercompany Transactions Created', `Invoice ID: ${invoiceId}, Bill ID: ${billId}`);
                    transactionIds.forEach(function(transaction) {
                        markTransactionAsPosted(transaction.id, invoiceId, billId);
                    });
                } catch (e) {
                    log.error('Error creating intercompany transactions', e.toString());
                    throw e;
                }
            } else {
                log.debug('No transactions to process');
            }

        } catch (e) {
            log.error('Error executing script', e.toString());
        }
    }

    function getTransactionsToProcess() {
        let transactionsTotal = 0;
        const transactionIds = [];
        const vendorbillSearchObj = search.load({
            id: 'customsearch_trans_for_ic_automation'
        });
        const searchResultCount = vendorbillSearchObj.runPaged().count;
        log.debug("vendorbillSearchObj result count", searchResultCount);
        const results = getAllSavedSearchResults(vendorbillSearchObj);
        results.forEach(function(result) {
            transactionIds.push({
                id: result.id
            });
            transactionsTotal += parseFloat(result.getValue('fxamount'));
        });

        log.debug('Transactions Total', transactionsTotal);

        return {transactionsTotal, transactionIds};
    }

    function createIntercompanyTransactions(transactionsTotal) {
        const invoiceId = createIntercompanyInvoice(transactionsTotal);
        log.debug('Intercompany invoiceId', invoiceId);
        const billId = createIntercompanyVendorBill(transactionsTotal, invoiceId);
        log.debug('Intercompany billId', billId);
        setBillIdOnInvoice(invoiceId, billId);

        return { invoiceId, billId };
    }

    function createIntercompanyInvoice(transactionsTotal) {
        const invoiceRec = record.create({
            type: 'invoice',
            isDynamic: true
        });
        invoiceRec.setValue({
            fieldId: 'entity',
            value: CONSTANTS.IC_CUSTOMER
        });
        invoiceRec.setValue({
            fieldId: 'approvalstatus',
            value: 2
        });

        invoiceRec.selectNewLine({
            sublistId: 'item'
        });
        invoiceRec.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'item',
            value: CONSTANTS.IC_INVOICE_ITEM
        });
        invoiceRec.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            value: 1
        });
        invoiceRec.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'rate',
            value: transactionsTotal
        });
        invoiceRec.commitLine({
            sublistId: 'item'
        });

        const invoiceId = invoiceRec.save({
            enableSourcing: false,
            ignoreMandatoryFields: true
        });
        return invoiceId;
    }

    function createIntercompanyVendorBill(transactionsTotal, invoiceId) {
        const billRec = record.create({
            type: 'vendorbill',
            isDynamic: true
        });
        billRec.setValue({
            fieldId: 'entity',
            value: CONSTANTS.IC_VENDOR
        });
        billRec.setValue({
            fieldId: 'account',
            value: CONSTANTS.IC_ACCOUNT
        });
        billRec.setValue({
            fieldId: 'intercotransaction',
            value: invoiceId
        });
        billRec.setValue({
            fieldId: 'approvalstatus',
            value: 2
        });

        // billRec.selectNewLine({
        //     sublistId: 'expense'
        // });
        // billRec.setCurrentSublistValue({
        //     sublistId: 'expense',
        //     fieldId: 'account',
        //     value: CONSTANTS.EXPENSE_ACCOUNT
        // });
        // billRec.setCurrentSublistValue({
        //     sublistId: 'expense',
        //     fieldId: 'amount',
        //     value: transactionsTotal
        // });
        // billRec.commitLine({
        //     sublistId: 'expense'
        // });
        billRec.selectNewLine({
            sublistId: 'item'
        });
        billRec.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'item',
            value: CONSTANTS.IC_BILL_ITEM
        });
        billRec.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            value: 1
        });
        billRec.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'rate',
            value: transactionsTotal
        });
        billRec.commitLine({
            sublistId: 'item'
        });

        const billId = billRec.save({
            enableSourcing: false,
            ignoreMandatoryFields: true
        });
        log.debug('Intercompany billId', billId);
        if (invoiceId) {
            try{
                record.submitFields({
                    type: 'vendorbill',
                    id: billId,
                    values: {
                        intercotransaction: invoiceId
                    },
                    options: {
                        ignoreMandatoryFields: true,
                        enableSourcing: false
                    }
                });
            } catch (e) {
                log.error('Error setting invoiceId on bill', e.toString());
            }
        }
        return billId;
    }

    function setBillIdOnInvoice(invoiceId, billId) {
       try{
        record.submitFields({
            type: 'invoice',
            id: invoiceId,
            values: {
                intercotransaction: billId
            }
        });
       } catch (e) {
        log.error('Error setting billId on invoice', e.toString());
       }
    }

    function markTransactionAsPosted(transactionId, invoiceId, billId) {
        log.debug('Marking transaction as posted', `Transaction ID: ${transactionId}, Invoice ID: ${invoiceId}, Bill ID: ${billId}`);
        record.submitFields({
            type: 'vendorbill',
            id: transactionId,
            values: {
                custbody_ic_posted: true,
                custbody_ps_icinvref: invoiceId,
                custbody_ps_icbillref: billId
            }
        });
        log.debug('Transaction marked as posted', `Transaction ID: ${transactionId}`);
    }

    function getAllSavedSearchResults(searchObj){
        try{
            let set = 0;
            let mappingResult = [];
            const rs = searchObj.run();
            do{
                set = rs.getRange({
                    start: mappingResult.length,
                    end: mappingResult.length + 1000
                });
                mappingResult = mappingResult.concat(set);
            } while (set.length === 1000);
            return mappingResult;

        } catch (e) {
            log.error('Error getAllSavedSearchResults', e);
            throw e;
        }
    };

    return {
        execute: execute
    };
});