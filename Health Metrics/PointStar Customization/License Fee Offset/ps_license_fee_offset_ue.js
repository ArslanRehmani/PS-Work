/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log', 'N/search', './../lodash.js'], function(record, log, search, _) {

    const CONSTANTS = {
        INVOICE_TYPE: {
            LICENSE_FEE: '1'
        },
        INVOICE_STATUS: {
            OPEN: 'Open',
            PAID: 'Paid In Full'
        },
        APPROVAL_STATUS: {
            APPROVED: '2'
        },
        VENDOR_BILL_STATUS: {
            OPEN: 'VendBill:A'
        },
        VENDOR_BILL_TYPE: {
            VENDOR_BILL: 'VendBill'
        },
        ACCOUNTS:{
            CLEARING_ACCOUNT: 222,
            AP_ACCOUNT: 111
        }
    };

    function afterSubmit(context) {
        var newRecord = context.newRecord;
        const invoiceId = newRecord.id;
        var type = context.type;
        log.debug('context.type', type);
        log.debug('context.newRecord', newRecord);

        if (type !== context.UserEventType.CREATE && type !== context.UserEventType.EDIT) {
            return;
        }
        const invoiceType = newRecord.getValue('custbody_inv_type');
        if(invoiceType !== CONSTANTS.INVOICE_TYPE.LICENSE_FEE) {
            return;
        } 
        const approvalStatus = newRecord.getValue('approvalstatus');
        const invoiceStatus = newRecord.getValue('status');
        if(approvalStatus !== CONSTANTS.APPROVAL_STATUS.APPROVED ||invoiceStatus === CONSTANTS.INVOICE_STATUS.PAID) {
            return;
        }

        
        const customerId = newRecord.getValue('entity');
        const vendorId = getVendorId(customerId);
        const subsidiary = newRecord.getValue('subsidiary');
        const clearingAccount = getAccountFromSubsidiary(subsidiary);
        log.debug('clearingAccount', clearingAccount);
        if(vendorId) {
            const vendorHasOpenBills = checkVendorHasOpenBills(vendorId);
            log.debug('vendorHasOpenBills', vendorHasOpenBills);
            if(vendorHasOpenBills) {
                const invoiceTotal = newRecord.getValue('total');
                const department = newRecord.getValue('department');
                createCustomerPayment(invoiceId, customerId, clearingAccount);
                createVendorPayment(vendorId, invoiceTotal, clearingAccount, department);
            }
        }
    }

    function getAccountFromSubsidiary(subsidiary) {
        let clearingAccount = null;
        const subsidiarySearchObj = search.lookupFields({
            type: search.Type.SUBSIDIARY,
            id: subsidiary,
            columns: ['custrecord_ps_clearingaccount']
        });
        log.debug('subsidiarySearchObj', subsidiarySearchObj);
        if(subsidiarySearchObj && subsidiarySearchObj.custrecord_ps_clearingaccount) {
            clearingAccount = subsidiarySearchObj.custrecord_ps_clearingaccount[0].value;
        }
        log.debug('clearingAccount', clearingAccount);
        return clearingAccount;
    }

    function getVendorId(customerId) {
        let vendorId = null;
        const customerSearchObj = search.create({
            type: "customer",
            filters:
            [
               ["internalid","anyof", customerId], 
               "AND", 
               ["otherrelationships","anyof","Vendor"]
            ],
            columns: []
         });
        const searchResultCount = customerSearchObj.runPaged().count;
        if(searchResultCount > 0) {
            customerSearchObj.run().each(function(result){
                vendorId = result.id;
                return false;
            });
        }
        return vendorId;
    }

    function checkVendorHasOpenBills(vendorId) {
        let vendorHasOpenBills = false;
        const vendorbillSearchObj = search.create({
            type: "vendorbill",
            settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
            filters:
            [
               ["type","anyof", CONSTANTS.VENDOR_BILL_TYPE.VENDOR_BILL], 
               "AND", 
               ["vendor.internalid","anyof", vendorId], 
               "AND", 
               ["status","anyof", CONSTANTS.VENDOR_BILL_STATUS.OPEN], 
               "AND", 
               ["mainline","is","T"]
            ],
            columns: []
        });
        const searchResultCount = vendorbillSearchObj.runPaged().count;
        if(searchResultCount > 0) {
            vendorHasOpenBills = true;
        }
         
        log.debug('vendorHasOpenBills', vendorHasOpenBills);
        return vendorHasOpenBills;
    }

    function createCustomerPayment(invoiceId, customerId, clearingAccount) {
        const customerPaymentRec = record.transform({
            fromType: record.Type.INVOICE,
            fromId: invoiceId,
            toType: record.Type.CUSTOMER_PAYMENT,
            isDynamic: true
        });
        customerPaymentRec.setValue({ fieldId: 'account', value: clearingAccount });
        const customerPaymentId = customerPaymentRec.save();
        log.debug('customerPaymentId', customerPaymentId);
    }

    function createVendorPayment(vendorId, invoiceTotal, clearingAccount, department) {
        const vendorPaymentRec = record.create({
            type: record.Type.VENDOR_PAYMENT,
            isDynamic: true
        });

        vendorPaymentRec.setValue({ fieldId: 'entity', value: vendorId });
        vendorPaymentRec.setValue({ fieldId: 'apacct', value: CONSTANTS.ACCOUNTS.AP_ACCOUNT });
        vendorPaymentRec.setValue({ fieldId: 'account', value: clearingAccount });
        vendorPaymentRec.setValue({ fieldId: 'department', value: department });

        const applyLineCount = vendorPaymentRec.getLineCount({ sublistId: 'apply' });
        const billsDue = [];
        for(let i=0; i<applyLineCount; i++) {
            const dateDue = vendorPaymentRec.getSublistValue({ sublistId: 'apply', fieldId: 'applydate', line: i });
            const type = vendorPaymentRec.getSublistValue({ sublistId: 'apply', fieldId: 'trantype', line: i });
            if(type !== CONSTANTS.VENDOR_BILL_TYPE.VENDOR_BILL) {
                continue;
            }
            const billId = vendorPaymentRec.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i });
            const amountDue = vendorPaymentRec.getSublistValue({ sublistId: 'apply', fieldId: 'due', line: i });

            billsDue.push({ 
                billId: billId,
                dateDue: dateDue,
                amountDue: amountDue,
                lineNum: i
            });
        }
        log.debug('billsDue', billsDue);
        const sortedBillsByDueDate = _.sortBy(billsDue, ['dateDue']);
        log.debug('sortedBillsByDueDate', sortedBillsByDueDate);
        let unappliedAmount = invoiceTotal;

        if(unappliedAmount > 0 && sortedBillsByDueDate.length > 0) {


            for(let i=0; i<sortedBillsByDueDate.length; i++) {
                vendorPaymentRec.selectLine({
                    sublistId: 'apply',
                    line: sortedBillsByDueDate[i].lineNum
                });

                let amountToApply = 0.0;
                if(unappliedAmount > sortedBillsByDueDate[i].amountDue) {
                    amountToApply = sortedBillsByDueDate[i].amountDue;
                } else if(unappliedAmount > 0 && unappliedAmount <= sortedBillsByDueDate[i].amountDue) {
                    amountToApply = unappliedAmount;
                }
                vendorPaymentRec.setCurrentSublistValue({
                    sublistId: 'apply',
                    fieldId: 'amount',
                    value: amountToApply
                });
                vendorPaymentRec.setCurrentSublistValue({
                    sublistId: 'apply',
                    fieldId: 'apply',
                    value: true
                });
                vendorPaymentRec.commitLine({
                    sublistId: 'apply'
                });
                unappliedAmount = unappliedAmount - parseFloat(amountToApply);
                if(unappliedAmount <= 0) break;
            }

            const vendorPaymentId = vendorPaymentRec.save();
            log.debug('vendorPaymentId', vendorPaymentId);
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});