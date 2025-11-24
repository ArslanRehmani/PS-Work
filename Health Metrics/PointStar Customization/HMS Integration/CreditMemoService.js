/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/record', 'N/search', './Utils/Validation', './Utils/Constants'], 
    function(log, record, search, Validation, CONSTANTS) {
        
        /**
         * Validates required credit memo fields
         * @param {Object} creditMemoData - Credit memo data object
         * @param {String} action - CREATE or UPDATE
         */
        function validateCreditMemoFields(creditMemoData, action) {
            if (action === 'CREATE') {
                const requiredFields = ['nsCustomerId', 'date', 'subsidiary', 'department', 'class', 'items', 'invoices'];
                Validation.validateFields(creditMemoData, requiredFields);
                
                if (!creditMemoData.items || !Array.isArray(creditMemoData.items) || creditMemoData.items.length === 0) {
                    throw { code: 'ER-002', message: 'At least one item is required' };
                }
                
                creditMemoData.items.forEach((item, index) => {
                    Validation.validateFields(item, ['nsItemId', 'rate', 'amount']);
                    if (item.quantity) Validation.validateFields(item, ['quantity']);
                    if (item.taxCode) Validation.validateFields(item, ['taxCode']);
                    if (item.taxAmount) Validation.validateFields(item, ['taxAmount']);
                    if (item.discountPercentage) Validation.validateFields(item, ['discountPercentage']);
                    if (item.discountAmount) Validation.validateFields(item, ['discountAmount']);
                });
                
                if (creditMemoData.invoices && Array.isArray(creditMemoData.invoices)) {
                    creditMemoData.invoices.forEach((invoice, index) => {
                        Validation.validateFields(invoice, ['nsInvoiceId', 'amount']);
                        log.debug(`Validating invoice ${index}`, JSON.stringify(invoice));
                        if (!Validation.validateInvoice(invoice.nsInvoiceId, creditMemoData.nsCustomerId)) {
                            throw { code: 'ER-013', message: `Invoice with ID ${invoice.nsInvoiceId} not found or does not belong to customer ${creditMemoData.nsCustomerId}` };
                        }
                    });
                }
            } else if (action === 'UPDATE') {
                const requiredFields = ['nsCreditmemoId', 'nsCustomerId', 'date'];
                Validation.validateFields(creditMemoData, requiredFields);
                
                if (creditMemoData.unapplyInvoices && Array.isArray(creditMemoData.unapplyInvoices)) {
                    creditMemoData.unapplyInvoices.forEach((invoice, index) => {
                        Validation.validateFields(invoice, ['nsInvoiceId']);
                    });
                }
                
                if (creditMemoData.applyNewInvoices && Array.isArray(creditMemoData.applyNewInvoices)) {
                    creditMemoData.applyNewInvoices.forEach((invoice, index) => {
                        Validation.validateFields(invoice, ['nsInvoiceId', 'amount']);
                        if (!Validation.validateInvoice(invoice.nsInvoiceId, creditMemoData.nsCustomerId)) {
                            throw { code: 'ER-013', message: `Invoice with ID ${invoice.nsInvoiceId} not found or does not belong to customer ${creditMemoData.nsCustomerId}` };
                        }
                    });
                }
            }
            
            if (!Validation.validateCustomer(creditMemoData.nsCustomerId)) {
                throw { code: 'ER-010', message: `Customer with ID ${creditMemoData.nsCustomerId} not found` };
            }
            
            // if (creditMemoData.nsAccountId && !Validation.validateAccount(creditMemoData.nsAccountId)) {
            //     throw { code: 'ER-011', message: `Account with ID ${creditMemoData.nsAccountId} not found` };
            // }
            
            log.debug('Credit memo validation passed', JSON.stringify({
                nsCustomerId: creditMemoData.nsCustomerId,
                nsCreditmemoId: creditMemoData.nsCreditmemoId || null,
                action: action
            }));
        }

        /**
         * Checks if a credit memo with the given referenceNumber already exists
         * @param {String} referenceNumber - Reference number to check
         * @returns {Boolean} - True if duplicate exists, false otherwise
         */
        function checkDuplicateReferenceNumber(referenceNumber) {
            try {
                var searchResult = search.create({
                    type: search.Type.CREDIT_MEMO,
                    filters: [
                        ["type","anyof","CustCred"], 
                    "AND", 
                    [
                        ["numbertext","is", referenceNumber],
                        "OR",
                        ["otherrefnum","equalto", referenceNumber]
                    ], 
                    "AND", 
                    ["mainline","is","T"]
                    ],
                    columns: ['internalid', 'otherrefnum']
                }).run().getRange({ start: 0, end: 1 });

                return searchResult.length > 0;
            } catch (e) {
                log.error('Error checking duplicate reference number', { message: e.message, stack: e.stack, referenceNumber: referenceNumber });
                throw e;
            }
        }
    
        /**
         * Creates or loads a credit memo record
         * @param {String} action - CREATE or UPDATE
         * @param {String} nsCreditmemoId - NetSuite credit memo ID (for updates)
         * @returns {Object} - NetSuite record object
         */
        function createOrLoadCreditMemoRecord(action, nsCreditmemoId) {
            if (action === 'UPDATE') {
                return record.load({
                    type: record.Type.CREDIT_MEMO,
                    id: nsCreditmemoId,
                    isDynamic: true
                });
            }
            return record.create({
                type: record.Type.CREDIT_MEMO,
                isDynamic: true
            });
        }
    
        /**
         * Formats date string to JavaScript Date object
         * @param {String} dateString - Date string in DD/MM/YYYY format
         * @returns {Date} - JavaScript Date object
         */
        function formatDate(dateString) {
            if (!dateString) return null;
            
            try {
                const parts = dateString.split('/');
                if (parts.length !== 3) {
                    log.error('Invalid date format', dateString);
                    return null;
                }
                return new Date(parts[2], parts[1] - 1, parts[0]);
            } catch (e) {
                log.error('Error formatting date', e);
                return null;
            }
        }
    
        /**
         * Sets base header fields on credit memo
         * @param {Object} rec - NetSuite record object
         * @param {Object} creditMemoData - Credit memo data
         * @returns {Object} - Updated NetSuite record
         */
        function setHeaderFields(rec, creditMemoData) {
            rec.setValue('customform', CONSTANTS.CUSTOM_FORMS.TRADE_CREDIT_MEMO);
            rec.setValue('entity', creditMemoData.nsCustomerId);
            const creditMemoDate = formatDate(creditMemoData.date);
            if (creditMemoDate) {
                rec.setValue('trandate', creditMemoDate);
            }
            
            if (creditMemoData.subsidiary) rec.setValue('subsidiary', creditMemoData.subsidiary);
            if (creditMemoData.department) rec.setValue('department', creditMemoData.department);
            if (creditMemoData.class) rec.setValue('class', creditMemoData.class);
            if (creditMemoData.referenceNumber) rec.setValue('tranid', creditMemoData.referenceNumber);
            if (creditMemoData.referenceNumber) rec.setValue('otherrefnum', creditMemoData.referenceNumber);
            
            // if (creditMemoData.nsAccountId) {
            //     try {
            //         rec.setValue('account', creditMemoData.nsAccountId);
            //         log.debug('Account set successfully', { nsAccountId: creditMemoData.nsAccountId });
            //     } catch (e) {
            //         log.error('Error setting account', { nsAccountId: creditMemoData.nsAccountId, error: e.message });
            //         throw { code: 'ER-015', message: `Failed to set account ID ${creditMemoData.nsAccountId}: ${e.message}` };
            //     }
            // }
            
            if (creditMemoData.memo) {
                rec.setValue('memo', creditMemoData.memo);
            }
            
            if (creditMemoData.discountItem && creditMemoData.discountAmount) {
                rec.setValue('discountitem', creditMemoData.discountItem);
                rec.setValue('discountrate', creditMemoData.discountAmount);
                log.debug('Discount set', { discountItem: creditMemoData.discountItem, discountAmount: creditMemoData.discountAmount });
            }
            
            return rec;
        }
    
        /**
         * Adds line items to credit memo
         * @param {Object} rec - NetSuite record object
         * @param {Array} items - Array of item objects
         * @returns {Object} - Updated NetSuite record
         */
        function addLineItems(rec, items) {
            if (!items || !Array.isArray(items)) return rec;
            
            items.forEach((item, index) => {
                try {
                    rec.selectLine({
                        sublistId: 'item',
                        line: index
                    });
                    
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: item.nsItemId
                    });
                    
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: item.quantity || 1
                    });
                    
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: item.rate
                    });
                    
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        value: item.amount
                    });
                    
                    if (item.discountPercentage || item.discountAmount) {
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'discount',
                            value: item.discountAmount || 
                                  (item.rate * (parseFloat(item.discountPercentage) / 100))
                        });
                    }
                    
                    if (item.taxCode) {
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'taxcode',
                            value: item.taxCode
                        });
                    }
                    
                    if (item.taxAmount) {
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'tax1amt',
                            value: item.taxAmount
                        });
                    }
                    
                    rec.commitLine({
                        sublistId: 'item'
                    });
                    
                } catch (e) {
                    log.error(`Error adding line item ${index}`, e);
                    throw { 
                        code: 'ER-020', 
                        message: `Failed to add item ${item.nsItemId}: ${e.message}` 
                    };
                }
            });
            
            return rec;
        }
    
        /**
         * Unapplies existing invoices from credit memo
         * @param {Object} rec - NetSuite record object
         * @param {Array} unapplyInvoices - Array of invoice data objects to unapply
         * @returns {Object} - Updated NetSuite record
         */
        function unapplyInvoices(rec, unapplyInvoices) {
            if (!unapplyInvoices || !Array.isArray(unapplyInvoices)) return rec;
            
            const lineCount = rec.getLineCount({ sublistId: 'apply' });
            let unappliedCount = 0;
            
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({ sublistId: 'apply', line: i });
                const lineInvoiceId = rec.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'internalid' });
                const isApplied = rec.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply' });
                
                const match = unapplyInvoices.find(invoice => String(invoice.nsInvoiceId) === String(lineInvoiceId));
                if (match && isApplied) {
                    rec.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: false });
                    rec.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: 0 });
                    rec.commitLine({ sublistId: 'apply' });
                    log.debug(`Unapplied invoice`, { nsInvoiceId: lineInvoiceId });
                    unappliedCount++;
                } else if (match && !isApplied) {
                    log.debug(`Invoice already unapplied`, { nsInvoiceId: lineInvoiceId });
                }
            }
            
            if (unappliedCount < unapplyInvoices.length) {
                log.warn(`Some invoices not found or already unapplied`, { requested: unapplyInvoices.length, unapplied: unappliedCount });
            }
            
            return rec;
        }
    
        /**
         * Applies credit memo to invoices
         * @param {Object} rec - NetSuite record object
         * @param {Array} invoices - Array of invoice data objects
         * @param {String} action - CREATE or UPDATE
         * @returns {Object} - Updated NetSuite record
         */
        function applyToInvoices(rec, invoices) {
            if (!invoices || !Array.isArray(invoices)) return rec;
            
            const lineCount = rec.getLineCount({ sublistId: 'apply' });
            
            // Match and update existing lines or add new ones for both CREATE and UPDATE
            invoices.forEach((invoice, index) => {
                let lineFound = false;
                for (let i = 0; i < lineCount; i++) {
                    rec.selectLine({ sublistId: 'apply', line: i });
                    const lineInvoiceId = rec.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'internalid' });
                    if (String(lineInvoiceId) === String(invoice.nsInvoiceId)) {
                        lineFound = true;
                        rec.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                        rec.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: invoice.amount });
                        rec.commitLine({ sublistId: 'apply' });
                        log.debug(`Updated existing invoice`, { nsInvoiceId: invoice.nsInvoiceId, amount: invoice.amount });
                        break;
                    }
                }
                if (!lineFound) {
                    rec.selectNewLine({ sublistId: 'apply' });
                    rec.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'internalid', value: invoice.nsInvoiceId });
                    rec.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                    rec.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: invoice.amount });
                    rec.commitLine({ sublistId: 'apply' });
                    log.debug(`Added new invoice`, { nsInvoiceId: invoice.nsInvoiceId, amount: invoice.amount });
                }
            });
            
            return rec;
        }
    
        /**
         * Saves the credit memo record
         * @param {Object} rec - NetSuite record object
         * @returns {String} - Record ID
         */
        function saveCreditMemoRecord(rec) {
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
        function createSuccessResponse(action, id) {
            return {
                status: 'success',
                message: `Credit Memo ${action.toLowerCase()}d successfully`,
                nsCreditMemoId: id
            };
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
         * Main handler function for credit memo requests
         * @param {Object} context - Request context
         * @returns {Object} - Response object
         */
        function handleRequest(context) {
            try {
                log.debug('handleRequest - Credit Memo', JSON.stringify(context));
                validateCreditMemoFields(context.data, context.action);
                if (context.action === 'CREATE' && context.data.referenceNumber) {
                    if (checkDuplicateReferenceNumber(context.data.referenceNumber)) {
                        throw { code: 'ER-018', message: `Reference number ${context.data.referenceNumber} already exists` };
                    }
                }

                log.debug(`Processing ${context.action} credit memo record`);
                const rec = createOrLoadCreditMemoRecord(context.action, context.data.nsCreditmemoId);
                
                log.debug('Setting header fields');
                setHeaderFields(rec, context.data);
                
                if (context.action === 'CREATE' && context.data.items) {
                    log.debug('Adding line items');
                    addLineItems(rec, context.data.items);
                }
                
                if (context.action === 'UPDATE') {
                    if (context.data.unapplyInvoices) {
                        log.debug('Unapplying invoices');
                        unapplyInvoices(rec, context.data.unapplyInvoices);
                    }
                    if (context.data.applyNewInvoices) {
                        log.debug('Applying new invoices');
                        applyToInvoices(rec, context.data.applyNewInvoices);
                    }
                } else if (context.action === 'CREATE' && context.data.invoices) {
                    log.debug('Applying to invoices');
                    applyToInvoices(rec, context.data.invoices);
                }
                
                log.debug('Saving credit memo record');
                const id = saveCreditMemoRecord(rec);
                log.debug('Credit memo saved with ID', id);
                
                return createSuccessResponse(context.action, id);
                
            } catch (e) {
                log.error('Error in CreditMemoService', e.name + ': ' + e.message);
                log.error('Error details', e);
                return createErrorResponse(e);
            }
        }
    
        return { handleRequest };
    });