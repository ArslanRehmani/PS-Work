/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/record', 'N/search', './Utils/Validation', './Utils/Constants'], function (log, record, search, Validation, CONSTANTS) {
    const APPROVED_STATUS = 2;

    /**
     * Validates required invoice fields
     * @param {Object} invoiceData - Invoice data object
     * @param {Object} context - Request context
     */
    function validateInvoiceFields(invoiceData, context) {
        Validation.validateFields(invoiceData, ['invoiceId', 'nsCustomerId', 'subsidiary', 'department', 'class', 'invoiceNumber', 'transactionDate', 'currency']);

        if (!invoiceData.items || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
            throw { code: 'ER-002', message: 'At least one item is required' };
        }

        invoiceData.items.forEach((item, index) => {
            Validation.validateFields(item, ['nsItemId', 'rate', 'quantity', 'amount']);
        });

        log.debug(
            'Invoice validation passed',
            JSON.stringify({
                invoiceId: invoiceData.invoiceId,
                nsCustomerId: invoiceData.nsCustomerId,
                itemCount: invoiceData.items.length,
            })
        );
    }

    /**
     * Validates required fields for UPDATE action
     * @param {Object} invoiceData - Invoice data object
     * @param {Object} context - Request context
     */
    function validateUpdateFields(invoiceData, context) {
        Validation.validateFields(invoiceData, ['nsInvoiceId', 'transactionDate']);

        log.debug(
            'Invoice update validation passed',
            JSON.stringify({
                nsInvoiceId: invoiceData.nsInvoiceId,
                transactionDate: invoiceData.transactionDate,
            })
        );
    }

    /**
     * Checks if an invoice with the given invoiceNumber already exists
     * @param {String} invoiceNumber - Invoice number to check
     * @returns {Boolean} - True if duplicate exists, false otherwise
     */
    function checkDuplicateInvoiceNumber(invoiceNumber) {
        try {
            var searchResult = search
                .create({
                    type: search.Type.INVOICE,
                    filters: [['type', 'anyof', 'CustInvc'], 'AND', [['numbertext', 'is', invoiceNumber], 'OR', ['otherrefnum', 'equalto', invoiceNumber]], 'AND', ['mainline', 'is', 'T']],
                    columns: ['internalid', 'otherrefnum'],
                })
                .run()
                .getRange({ start: 0, end: 1 });
            log.debug('Duplicate invoice search result', JSON.stringify(searchResult));

            return searchResult.length > 0;
        } catch (e) {
            log.error('Error checking duplicate invoice number', { message: e.message, stack: e.stack, invoiceNumber: invoiceNumber });
            throw e;
        }
    }

    /**
     * Creates an invoice record
     * @returns {Object} - NetSuite record object
     */
    function createInvoiceRecord() {
        return record.create({
            type: record.Type.INVOICE,
            isDynamic: true,
        });
    }

    /**
     * Updates an invoice record's transaction date
     * @param {String} invoiceId - NetSuite invoice internal ID
     * @param {String} transactionDate - New transaction date in DD/MM/YYYY format
     * @returns {String} - Record ID
     */
    function updateInvoiceRecord(invoiceId, transactionDate) {
        const formattedDate = formatDate(transactionDate);

        if (!formattedDate) {
            throw { code: 'ER-019', message: 'Invalid transaction date format. Expected DD/MM/YYYY' };
        }

        log.debug(
            'Updating invoice',
            JSON.stringify({
                invoiceId: invoiceId,
                newTransactionDate: transactionDate,
                formattedDate: formattedDate,
            })
        );

        return record.submitFields({
            type: record.Type.INVOICE,
            id: invoiceId,
            values: {
                trandate: formattedDate,
            },
            options: {
                enableSourcing: false,
                ignoreMandatoryFields: true,
            },
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
     * Sets base header fields on invoice record
     * @param {Object} rec - NetSuite record object
     * @param {Object} invoiceData - Invoice data object
     * @returns {Object} - Updated NetSuite record
     */
    function setHeaderFields(rec, invoiceData) {
        rec.setValue('customform', CONSTANTS.CUSTOM_FORMS.TRADE_INVOICE);
        rec.setValue('entity', invoiceData.nsCustomerId);
        rec.setValue('custbody_ps_hms_invoice_id', invoiceData.invoiceId);
        rec.setValue('tranid', invoiceData.invoiceNumber);
        rec.setValue('otherrefnum', invoiceData.invoiceNumber);

        const transactionDate = formatDate(invoiceData.transactionDate);

        if (transactionDate) {
            rec.setValue('trandate', transactionDate);
        }

        rec.setValue('subsidiary', invoiceData.subsidiary);
        rec.setValue('department', invoiceData.department);
        rec.setValue('class', invoiceData.class);

        rec.setValue('memo', invoiceData.memo);

        if (invoiceData.currency) {
            const currencyMap = {
                MYR: 1,
                USD: 2,
                SGD: 6,
                IDR: 7,
            };

            const currencyId = currencyMap[invoiceData.currency] || 1;
            rec.setValue('currency', currencyId);
        }

        // Set billing period if provided
        if (invoiceData.billingPeriod) {
            rec.setValue('custbody_ps_hms_billing_period', invoiceData.billingPeriod);
        }

        if (invoiceData.invoiceCategory) {
            rec.setValue('custbody_inv_type', invoiceData.invoiceCategory);
        }

        if (invoiceData.discountItem) {
            rec.setValue('discountitem', invoiceData.discountItem);
        }

        if (invoiceData.discountAmount) {
            rec.setValue('discountrate', invoiceData.discountAmount);
        }

        rec.setValue('approvalstatus', APPROVED_STATUS);

        return rec;
    }

    /**
     * Sets item line fields on invoice record
     * @param {Object} rec - NetSuite record object
     * @param {Array} items - Array of item data objects
     * @returns {Object} - Updated NetSuite record
     */
    function setItemFields(rec, items) {
        if (!items || !Array.isArray(items)) return rec;

        items.forEach((item, index) => {
            try {
                rec.selectNewLine({
                    sublistId: 'item',
                });

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: item.nsItemId,
                });

                if (item.description) {
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'description',
                        value: item.description,
                    });
                }

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: item.quantity,
                });

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: item.rate,
                });

                if (item.taxCode) {
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'taxcode',
                        value: item.taxCode,
                    });
                }

                if (item.taxAmount) {
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'tax1amt',
                        value: item.taxAmount,
                    });
                }

                rec.commitLine({
                    sublistId: 'item',
                });

                log.debug(
                    `Item ${index} added`,
                    JSON.stringify({
                        nsItemId: item.nsItemId,
                        quantity: item.quantity,
                        rate: item.rate,
                    })
                );
            } catch (e) {
                log.error(`Error setting item ${index}`, e.name + ': ' + e.message);
                log.error('Error details', e);
                throw e;
            }
        });

        return rec;
    }

    /**
     * Saves the invoice record
     * @param {Object} rec - NetSuite record object
     * @returns {String} - Record ID
     */
    function saveInvoiceRecord(rec) {
        return rec.save({
            enableSourcing: true,
            ignoreMandatoryFields: true,
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
            message: `Invoice ${action.toLowerCase()}d successfully`,
            nsInvoiceId: id,
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
            message: error.message,
        };
    }

    /**
     * Main handler function for invoice requests
     * @param {Object} context - Request context
     * @returns {Object} - Response object
     */
    function handleRequest(context) {
        try {
            log.debug('handleRequest - Invoice', JSON.stringify(context));

            const action = context.action || 'CREATE';

            if (action === 'UPDATE') {
                // Handle UPDATE action
                validateUpdateFields(context.data, context);

                log.debug('Updating invoice record');
                const id = updateInvoiceRecord(context.data.nsInvoiceId, context.data.transactionDate);
                log.debug('Invoice updated with ID', id);

                return createSuccessResponse(action, id);
            } else if (action === 'CREATE') {
                // Handle CREATE action
                validateInvoiceFields(context.data, context);

                // Check for duplicate invoice number
                if (checkDuplicateInvoiceNumber(context.data.invoiceNumber)) {
                    throw { code: 'ER-018', message: `Invoice number ${context.data.invoiceNumber} already exists` };
                }

                log.debug('Creating invoice record');
                const rec = createInvoiceRecord();

                log.debug('Setting header fields');
                setHeaderFields(rec, context.data);

                log.debug('Setting item fields');
                setItemFields(rec, context.data.items);

                log.debug('Saving invoice record');
                const id = saveInvoiceRecord(rec);
                log.debug('Invoice saved with ID', id);

                return createSuccessResponse(action, id);
            } else {
                throw { code: 'ER-020', message: `Invalid action: ${action}. Supported actions are CREATE and UPDATE` };
            }
        } catch (e) {
            log.error('Error in InvoiceService', e.name + ': ' + e.message);
            log.error('Error details', e);
            return createErrorResponse(e);
        }
    }

    return { handleRequest };
});
