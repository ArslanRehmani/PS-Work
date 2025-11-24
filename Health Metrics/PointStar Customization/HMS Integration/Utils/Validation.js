/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/record', 'N/search'], function( log, record, search) {
    function validateFields(data, requiredFields) {
        requiredFields.forEach(field => {
            if (!data[field]) throw { code: 'ER-001: MISSING_REQUIRED_FIELDS', message: `Required field: ${field}` };
        });
    }

    /**
     * Validates if a customer exists in NetSuite
     * @param {String} customerId - NetSuite customer internal ID
     * @returns {Boolean} - True if customer exists, false otherwise
     */
    function validateCustomer(customerId) {
        try {
            const customerRecord = record.load({
                type: record.Type.CUSTOMER,
                id: customerId,
                isDynamic: false
            });
            return true;
        } catch (e) {
            log.error('Customer validation failed', e);
            return false;
        }
    }
    
    /**
     * Validates if an invoice exists in NetSuite and belongs to the customer
     * @param {String} invoiceId - NetSuite invoice internal ID
     * @param {String} customerId - NetSuite customer internal ID
     * @returns {Boolean} - True if invoice exists and belongs to customer, false otherwise
     */
    function validateInvoice(invoiceId, customerId) {
        log.debug('Validating invoice', { invoiceId: invoiceId, customerId: customerId });
        var invoiceSearch = search.create({
            type: search.Type.INVOICE,
            filters: [
                ['internalid', search.Operator.IS, Number(invoiceId)], 
                'AND',
                ['entity', search.Operator.IS, Number(customerId)]
            ],
            columns: ['internalid']
        }).run().getRange({ start: 0, end: 1 });
        var isValid = invoiceSearch.length > 0;
        log.debug('Invoice validation result', { invoiceId: invoiceId, isValid: isValid });
        return isValid;
    }
    
    /**
     * Validates if an account exists in NetSuite
     * @param {String} accountId - NetSuite account internal ID
     * @returns {Boolean} - True if account exists, false otherwise
     */
    function validateAccount(accountId) {
        try {
            const accountRecord = record.load({
                type: record.Type.ACCOUNT,
                id: accountId,
                isDynamic: false
            });
            return true;
        } catch (e) {
            log.error('Account validation failed', e);
            return false;
        }
    }

    /**
     * Validates if a vendor exists in NetSuite
     * @param {String} vendorId - NetSuite vendor internal ID
     * @returns {Boolean} - True if vendor exists, false otherwise
     */
    function validateVendor(vendorId) {
        try {
            const vendorRecord = record.load({
                type: record.Type.VENDOR,
                id: vendorId,
                isDynamic: false
            });
            return true;
        } catch (e) {
            log.error('Vendor validation failed', e);
            return false;
        }
    }

    /**
     * Validates if a vendor bill exists in NetSuite and belongs to the vendor
     * @param {String} billId - NetSuite vendor bill internal ID
     * @param {String} vendorId - NetSuite vendor internal ID
     * @returns {Boolean} - True if bill exists and belongs to vendor, false otherwise
     */
    function validateVendorBill(billId, vendorId) {
        try {
            const billSearch = search.create({
                type: search.Type.VENDOR_BILL,
                filters: [
                    ['internalid', 'is', billId],
                    'AND',
                    ['entity', 'is', vendorId]
                ],
                columns: ['internalid']
            });
            
            const searchResult = billSearch.run().getRange({
                start: 0,
                end: 1
            });
            
            return searchResult.length > 0;
        } catch (e) {
            log.error('Vendor bill validation failed', e);
            return false;
        }
    }

     /**
     * Validates if an item exists in NetSuite
     * @param {String} itemId - NetSuite item internal ID
     * @returns {Boolean} - True if item exists, false otherwise
     */
     function validateItem(itemId) {
        try {
            const itemRecord = record.load({
                type: record.Type.SERVICE_ITEM,
                id: itemId,
                isDynamic: false
            });
            return true;
        } catch (e) {
            log.error('Item validation failed', e);
            return false;
        } 
    }

    return { 
        validateFields,
        validateCustomer,
        validateInvoice,
        validateAccount,
        validateVendor,
        validateItem,
        validateVendorBill
    };
});