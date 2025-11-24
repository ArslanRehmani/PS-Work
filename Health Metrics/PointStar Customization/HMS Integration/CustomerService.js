/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/record', 'N/search', 'N/url', 'N/https', './Utils/Validation'], function(log, record, search, url, https, Validation) {
    
    const CUSTOMER_CLOSED_WON_STATUS = 13;
    /**
     * Validates required customer fields based on customer type
     * @param {Object} customerData - Customer data object
     */
    function validateCustomerFields(customerData, context) {
        Validation.validateFields(customerData, [
            'customerId', 'type'
        ]);
        if(context.action === 'CREATE') {
            Validation.validateFields(customerData, ['subsidiary']);
        }
        if(customerData.type && customerData.type.toLowerCase() === 'company') {
            Validation.validateFields(customerData, ['companyName']);
        } else {
            Validation.validateFields(customerData, ['name']);
        }
        
        if (customerData.address) {
            Validation.validateFields(customerData.address, [
                'address', 'city', 'country', 'state', 'zip'
            ]);
            log.debug('Address validation passed', JSON.stringify(customerData.address));
        }
    }

    /**
     * Creates or loads a customer record based on action
     * @param {String} action - CREATE or UPDATE
     * @param {String} nsCustomerId - NetSuite customer ID (for updates)
     * @returns {Object} - NetSuite record object
     */
    function createOrLoadRecord(action, nsCustomerId) {
        if (action === 'CREATE') {
            return record.create({
                type: record.Type.CUSTOMER,
                isDynamic: true
            });
        } else {
            return record.load({
                type: record.Type.CUSTOMER,
                id: nsCustomerId,
                isDynamic: true
            });
        }
    }

    /**
     * Sets base fields on customer record
     * @param {Object} rec - NetSuite record object
     * @param {Object} customerData - Customer data object
     * @returns {Object} - Updated NetSuite record
     */
    function setBaseFields(rec, customerData) {
        if (customerData.type && customerData.type.toLowerCase() === 'individual') {
            rec.setValue('isperson', 'T');
            
            if (customerData.name && customerData.name.includes(' ')) {
                const nameParts = customerData.name.split(' ');
                rec.setValue('firstname', nameParts[0]);
                rec.setValue('lastname', nameParts.slice(1).join(' '));
            } else {
                rec.setValue('firstname', customerData.name || '');
                rec.setValue('lastname', '');
            }
        } else {
            rec.setValue('isperson', 'F');
            rec.setValue('companyname', customerData.companyName || '');
        }
        
        rec.setValue('custentity_ps_hms_customer_id', customerData.customerId);
        rec.setValue('email', customerData.email);
        rec.setValue('phone', customerData.phone);
        rec.setValue('entitystatus', CUSTOMER_CLOSED_WON_STATUS);
        
        if (customerData.subsidiary) {
            rec.setValue('subsidiary', customerData.subsidiary);
        }
        
        if (customerData.category) {
            rec.setValue('category', customerData.category);
        }
        
        if (customerData.corporateCode) {
            rec.setValue('custentity_ps_corporatecode', customerData.corporateCode);
        }
        
        if (customerData.panelCode) {
            rec.setValue('custentity_ps_panelcode', customerData.panelCode);
        }
        
        return rec;
    }

    /**
     * Sets address fields on customer record
     * @param {Object} rec - NetSuite record object
     * @param {Object} address - Address data object
     * @returns {Object} - Updated NetSuite record
     */
    function setAddressFields(rec, address) {
        try {
            rec.selectNewLine({
                sublistId: 'addressbook'
            });
            
            var addressSubrecord = rec.getCurrentSublistSubrecord({
                sublistId: 'addressbook',
                fieldId: 'addressbookaddress'
            });
            
            if (!addressSubrecord) {
                log.error('Address subrecord initialization failed', { address: address });
                throw new Error('Failed to initialize address subrecord');
            }
            
            // Set address fields
            addressSubrecord.setValue({ fieldId: 'addr1', value: address.address || '' });
            addressSubrecord.setValue({ fieldId: 'city', value: address.city || '' });
            addressSubrecord.setValue({ fieldId: 'state', value: address.state || '' });
            addressSubrecord.setValue({ fieldId: 'country', value: address.country || '' });
            addressSubrecord.setValue({ fieldId: 'zip', value: address.zip || '' });
            
            // Set sublist values
            rec.setCurrentSublistValue({
                sublistId: 'addressbook',
                fieldId: 'defaultbilling',
                value: !!address.defaultBilling
            });
            rec.setCurrentSublistValue({
                sublistId: 'addressbook',
                fieldId: 'defaultshipping',
                value: !!address.defaultShipping
            });
            rec.setCurrentSublistValue({
                sublistId: 'addressbook',
                fieldId: 'label',
                value: 'Primary Address'
            });
            rec.setCurrentSublistValue({
                sublistId: 'addressbook',
                fieldId: 'isresidential',
                value: false
            });
            
            rec.commitLine({ sublistId: 'addressbook' });
            log.audit('Address set successfully', { address: address });
        } catch (e) {
            log.error('Error setting address fields', { message: e.message, stack: e.stack, address: address });
            throw e; // Re-throw to be caught by handleRequest
        }
        
        return rec;
    }

    /**
     * Sets vendor relationship if isVendorAlso is true
     * @param {Object} rec - NetSuite record object
     * @param {Object} customerData - Customer data object
     * @param {String} customerId - NetSuite customer ID
     * @returns {Object} - Updated NetSuite record
     */
    function setVendorRelationship(customerData, customerId) {
        const vendorRec =  record.transform({
         fromType: record.Type.CUSTOMER,
         fromId: customerId,
         toType: record.Type.VENDOR,
         isDynamic: true,
        });
        const vendorId = vendorRec.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });
        log.debug('Vendor relationship set successfully', { customerId, vendorId });
        return vendorId;
    }

    /**
     * Saves the customer record
     * @param {Object} rec - NetSuite record object
     * @returns {String} - Record ID
     */
    function saveCustomerRecord(rec) {
        return rec.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });
    }

    /**
     * Creates success response object
     * @param {String} action - CREATE or UPDATE
     * @param {String} id - NetSuite record ID
     * @returns {Object} - Success response
     */
    function createSuccessResponse(action, id, vendorId = null) {
        const response = {
            status: 'success',
            message: `Customer ${action.toLowerCase()}d successfully`,
            nsCustomerId: id
        };
        if (vendorId) {
            response.nsVendorId = vendorId;
        }
        return response;
    }

    /**
     * Creates error response object
     * @param {Object} error - Error object
     * @returns {Object} - Error response
     */
    function createErrorResponse(error) {
        return {
            status: 'error',
            code: error.code || 'ER-000',
            message: error.message
        };
    }

    /**
     * Main handler function for customer requests
     * @param {Object} context - Request context
     * @returns {Object} - Response object
     */
    function handleRequest(context) {
        try {
            log.debug('handleRequest - Customer', JSON.stringify(context));
            validateCustomerFields(context.data, context);
            
            let rec = createOrLoadRecord(
                context.action,
                context.data.nsCustomerId
            );
            
            setBaseFields(rec, context.data);
            
            if (context.data.address) {
                setAddressFields(rec, context.data.address);
            }
            
            let customerId = saveCustomerRecord(rec);
            let vendorId = null;
            if(context.data.isVendorAlso) {
                vendorId = setVendorRelationship(context.data, customerId, vendorId);
            }
           
            return createSuccessResponse(context.action, customerId);
            
        } catch (e) {
            log.error('Error in CustomerService', { message: e.message, stack: e.stack });
            return createErrorResponse(e);
        }
    }

    return { handleRequest };
});