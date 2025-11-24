/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/record', 'N/search', './Utils/Validation'], function (log, record, search, Validation) {
    /**
     * Validates required payment fields
     * @param {Object} paymentData - Payment data object
     * @param {Object} context - Request context
     */
    function validatePaymentFields(paymentData, context) {
        const requiredFields = ['nsCustomerId', 'date', 'nsARAccount', 'nsAccountId', 'currency', 'paymentMethod'];
        if (context.action === 'CREATE') {
            requiredFields.push('invoices');
        } else if (context.action === 'UPDATE') {
            requiredFields.push('nsPaymentId');
        }

        Validation.validateFields(paymentData, requiredFields);

        if (paymentData.subsidiary) Validation.validateFields(paymentData, ['subsidiary']);
        if (paymentData.department) Validation.validateFields(paymentData, ['department']);
        if (paymentData.class) Validation.validateFields(paymentData, ['class']);

        if (context.action === 'CREATE' && !Validation.validateCustomer(paymentData.nsCustomerId)) {
            throw {
                code: 'ER-010',
                message: `Customer with ID ${paymentData.nsCustomerId} not found`,
            };
        }

        if (!Validation.validateAccount(paymentData.nsAccountId)) {
            throw {
                code: 'ER-011',
                message: `Account with ID ${paymentData.nsAccountId} not found`,
            };
        }

        if (!Validation.validateAccount(paymentData.nsARAccount)) {
            throw {
                code: 'ER-012',
                message: `AR Account with ID ${paymentData.nsARAccount} not found`,
            };
        }

        // Validate invoices for CREATE
        if (context.action === 'CREATE' && paymentData.invoices) {
            if (!Array.isArray(paymentData.invoices) || paymentData.invoices.length === 0) {
                throw { code: 'ER-002', message: 'At least one invoice is required' };
            }
            paymentData.invoices.forEach((invoice, index) => {
                Validation.validateFields(invoice, ['nsInvoiceId', 'amount']);
                if (!Validation.validateInvoice(invoice.nsInvoiceId, paymentData.nsCustomerId)) {
                    throw {
                        code: 'ER-013',
                        message: `Invoice with ID ${invoice.nsInvoiceId} not found or does not belong to customer ${paymentData.nsCustomerId}`,
                    };
                }
            });
        }

        // Validate unapplyInvoices and applyNewInvoices for UPDATE
        if (context.action === 'UPDATE') {
            if (paymentData.unapplyInvoices && Array.isArray(paymentData.unapplyInvoices)) {
                paymentData.unapplyInvoices.forEach((invoice, index) => {
                    Validation.validateFields(invoice, ['nsInvoiceId']);
                });
            }
            if (paymentData.applyNewInvoices && Array.isArray(paymentData.applyNewInvoices)) {
                paymentData.applyNewInvoices.forEach((invoice, index) => {
                    Validation.validateFields(invoice, ['nsInvoiceId', 'amount']);
                    if (!Validation.validateInvoice(invoice.nsInvoiceId, paymentData.nsCustomerId)) {
                        throw {
                            code: 'ER-013',
                            message: `Invoice with ID ${invoice.nsInvoiceId} not found or does not belong to customer ${paymentData.nsCustomerId}`,
                        };
                    }
                });
            }
        }

        log.debug(
            'Payment validation passed',
            JSON.stringify({
                nsCustomerId: paymentData.nsCustomerId,
                action: context.action,
            })
        );
    }

    /**
     * Creates or loads a customer payment record
     * @param {String} action - CREATE or UPDATE
     * @param {String} nsPaymentId - NetSuite payment ID (for updates)
     * @returns {Object} - NetSuite record object
     */
    function createOrLoadRecord(action, nsPaymentId) {
        if (action === 'UPDATE') {
            return record.load({
                type: record.Type.CUSTOMER_PAYMENT,
                id: nsPaymentId,
                isDynamic: true,
            });
        }
        return record.create({
            type: record.Type.CUSTOMER_PAYMENT,
            isDynamic: true,
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
     * Sets base header fields on payment record
     * @param {Object} rec - NetSuite record object
     * @param {Object} paymentData - Payment data object
     * @returns {Object} - Updated NetSuite record
     */
    function setHeaderFields(rec, paymentData, action) {
        // rec.setValue("undepfunds", "F");
        if (paymentData.nsCustomerId) rec.setValue('customer', paymentData.nsCustomerId);
        const paymentDate = formatDate(paymentData.date);
        if (paymentDate) rec.setValue('trandate', paymentDate);
        if (paymentData.subsidiary) rec.setValue('subsidiary', paymentData.subsidiary);
        if (paymentData.department) rec.setValue('department', paymentData.department);
        if (paymentData.class) rec.setValue('class', paymentData.class);
        if (paymentData.nsARAccount) rec.setValue('aracct', paymentData.nsARAccount);
        if (paymentData.nsAccountId) {
            log.debug('Setting account', paymentData.nsAccountId);
            // Setting account after undepfunds is already set to F
            rec.setValue('account', paymentData.nsAccountId);

            // Force a getValue to verify it was set
            const accountSet = rec.getValue('account');
            log.debug('Account after setting', accountSet);
        }

        // if (paymentData.nsAccountId) {
        //     try {
        //         // Validate account in context (e.g., subsidiary and type)
        //         const accountSearch = search.create({
        //             type: search.Type.ACCOUNT,
        //             filters: [
        //                 ['internalid', 'is', paymentData.nsAccountId],
        //                 'AND',
        //                 ['isinactive', 'is', 'F'],
        //                 'AND',
        //                 ['type', 'anyof', ['AcctType.ACCOUNT_RECEIVABLE', 'AcctType.BANK']]
        //             ],
        //             columns: ['internalid', 'subsidiary', 'type']
        //         }).run().getRange({ start: 0, end: 1 });

        //         if (accountSearch.length === 0) {
        //             log.error('Account not found, inactive, or invalid type', { nsAccountId: paymentData.nsAccountId });
        //             throw { code: 'ER-014', message: `Account with ID ${paymentData.nsAccountId} not found, inactive, or not an AR/Bank account` };
        //         }

        //         const subsidiary = accountSearch[0].getValue('subsidiary');
        //         if (subsidiary && paymentData.subsidiary && String(subsidiary) !== String(paymentData.subsidiary)) {
        //             log.warn('Account subsidiary mismatch', { accountSubsidiary: subsidiary, paymentSubsidiary: paymentData.subsidiary });
        //         }

        //         rec.setValue('account', paymentData.nsAccountId);
        //         rec.setValue('undepfunds', 'F');
        //         log.debug('Account set successfully', { nsAccountId: paymentData.nsAccountId, accountType: accountSearch[0].getValue('type') });
        //     } catch (e) {
        //         log.error('Error setting account', { nsAccountId: paymentData.nsAccountId, error: e.message });
        //         throw { code: 'ER-015', message: `Failed to set account ID ${paymentData.nsAccountId}: ${e.message}` };
        //     }
        // }

        if (paymentData.memo) rec.setValue('memo', paymentData.memo);
        if (paymentData.currency) {
            const currencyMap = { MYR: 1, USD: 2, SGD: 6, IDR: 7 };
            const currencyId = currencyMap[paymentData.currency] || 1;
            rec.setValue('currency', currencyId);
        }
        if (paymentData.paymentMethod) {
            const paymentMethodMap = { Check: 2, Cash: 1, Giro: 7 };
            const paymentMethodId = paymentMethodMap[paymentData.paymentMethod] || 1;
            rec.setValue('paymentmethod', paymentMethodId);
        }
        return rec;
    }

    /**
     * Unapplies existing invoices from payment record
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
            const lineInvoiceId = rec.getCurrentSublistValue({
                sublistId: 'apply',
                fieldId: 'internalid',
            });
            const isApplied = rec.getCurrentSublistValue({
                sublistId: 'apply',
                fieldId: 'apply',
            });
            const currentAccount = rec.getValue('account'); // Log current account state
            log.debug('Checking unapply line', {
                lineInvoiceId,
                isApplied,
                currentAccount,
            });

            const match = unapplyInvoices.find((invoice) => String(invoice.nsInvoiceId) === String(lineInvoiceId));
            if (match && isApplied) {
                rec.setCurrentSublistValue({
                    sublistId: 'apply',
                    fieldId: 'apply',
                    value: false,
                });
                rec.setCurrentSublistValue({
                    sublistId: 'apply',
                    fieldId: 'amount',
                    value: 0,
                });
                rec.commitLine({ sublistId: 'apply' });
                log.debug(`Unapplied invoice`, {
                    nsInvoiceId: lineInvoiceId,
                    currentAccount: rec.getValue('account'),
                });
                unappliedCount++;
            } else if (match && !isApplied) {
                log.debug(`Invoice already unapplied`, {
                    nsInvoiceId: lineInvoiceId,
                    currentAccount: rec.getValue('account'),
                });
            }
        }

        if (unappliedCount < unapplyInvoices.length) {
            log.debug(`Some invoices not found or already unapplied`, {
                requested: unapplyInvoices.length,
                unapplied: unappliedCount,
            });
        }

        return rec;
    }

    /**
     * Applies new invoices to payment record
     * @param {Object} rec - NetSuite record object
     * @param {Array} applyNewInvoices - Array of invoice data objects to apply
     * @returns {Object} - Updated NetSuite record
     */
    function applyNewInvoices(rec, applyNewInvoices) {
        if (!applyNewInvoices || !Array.isArray(applyNewInvoices) || applyNewInvoices.length == 0) return rec;
        log.debug('applyNewInvoices.length == 0', applyNewInvoices);

        let totalPaymentAmount = 0;
        const existingLineCount = rec.getLineCount({ sublistId: 'apply' });
        log.debug('Existing apply line count', existingLineCount);
        applyNewInvoices.forEach((invoice, index) => {
            try {
                let lineFound = false;
                for (let i = 0; i < existingLineCount; i++) {
                    rec.selectLine({ sublistId: 'apply', line: i });
                    const lineInvoiceId = rec.getCurrentSublistValue({
                        sublistId: 'apply',
                        fieldId: 'internalid',
                    });
                    log.debug(`Checking line ${i}`, {
                        lineInvoiceId,
                        invoiceId: invoice.nsInvoiceId,
                        currentAccount: rec.getValue('account'),
                    });
                    if (String(lineInvoiceId) == String(invoice.nsInvoiceId)) {
                        lineFound = true;
                        rec.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            value: true,
                        });
                        rec.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'amount',
                            value: invoice.amount,
                        });
                        rec.commitLine({ sublistId: 'apply' });
                        log.debug(`Updated existing invoice`, {
                            nsInvoiceId: invoice.nsInvoiceId,
                            amount: invoice.amount,
                            currentAccount: rec.getValue('account'),
                        });
                        totalPaymentAmount += Number(invoice.amount);
                        break;
                    }
                }

                if (!lineFound) {
                    throw {
                        code: 'ER-016',
                        message: `Invoice with ID ${invoice.nsInvoiceId} not found to apply on payment`,
                    };
                }
            } catch (e) {
                log.error(`Error applying new invoice ${index}`, {
                    error: e.message,
                    currentAccount: rec.getValue('account'),
                });
                throw e;
            }
        });

        rec.setValue('payment', totalPaymentAmount);
        log.debug('Updated total payment amount', {
            totalPaymentAmount,
            currentAccount: rec.getValue('account'),
        });
        return rec;
    }

    /**
     * Applies initial invoices for CREATE
     * @param {Object} rec - NetSuite record object
     * @param {Array} invoices - Array of invoice data objects
     * @returns {Object} - Updated NetSuite record
     */
    function applyInvoices(rec, invoices) {
        if (!invoices || !Array.isArray(invoices)) return rec;

        const totalPaymentAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
        rec.setValue('payment', totalPaymentAmount);
        const applyLineCount = rec.getLineCount({ sublistId: 'apply' });
        log.debug('applyInvoices - Initial invoices', {
            totalPaymentAmount,
            applyLineCount,
            invoices,
        });

        invoices.forEach((invoice, index) => {
            try {
                let lineFound = false;

                for (let i = 0; i < applyLineCount; i++) {
                    rec.selectLine({ sublistId: 'apply', line: i });
                    const lineInvoiceId = rec.getCurrentSublistValue({
                        sublistId: 'apply',
                        fieldId: 'internalid',
                    });
                    if (String(lineInvoiceId) === String(invoice.nsInvoiceId)) {
                        lineFound = true;
                        rec.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            value: true,
                        });
                        rec.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'amount',
                            value: invoice.amount,
                        });
                        rec.commitLine({ sublistId: 'apply' });
                    }
                }

                if (!lineFound) {
                    throw {
                        code: 'ER-016',
                        message: `Invoice with ID ${invoice.nsInvoiceId} not found to apply on payment`,
                    };
                }
            } catch (e) {
                log.error(`Error applying initial invoice ${index}`, e);
                throw e;
            }
        });
        return rec;
    }

    /**
     * Saves the payment record
     * @param {Object} rec - NetSuite record object
     * @returns {String} - Record ID
     */
    function savePaymentRecord(rec) {
        const currentAccount = rec.getValue('account');
        log.debug('Saving record with account', { currentAccount });
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
            message: `Customer Payment ${action.toLowerCase()}d successfully`,
            nsPaymentId: id,
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
     * Main handler function for payment requests
     * @param {Object} context - Request context
     * @returns {Object} - Response object
     */
    function handleRequest(context) {
        try {
            log.debug('handleRequest - Customer Payment', JSON.stringify(context));
            validatePaymentFields(context.data, context);

            log.debug(`Processing ${context.action} customer payment record`);
            const rec = createOrLoadRecord(context.action, context.data.nsPaymentId);

            log.debug('Setting header fields');
            setHeaderFields(rec, context.data, context.action);

            if (context.action === 'CREATE' && context.data.invoices) {
                log.debug('Applying initial invoices');
                applyInvoices(rec, context.data.invoices);
            } else if (context.action === 'UPDATE') {
                if (context.data.unapplyInvoices) {
                    log.debug('Unapplying invoices');
                    unapplyInvoices(rec, context.data.unapplyInvoices);
                }
                if (context.data.applyNewInvoices) {
                    log.debug('Applying new invoices');
                    applyInvoices(rec, context.data.applyNewInvoices);
                }
            }

            log.debug('Saving customer payment record');
            if (context.data.nsAccountId) {
                log.debug('Re-setting account before save', context.data.nsAccountId);
                rec.setValue('account', context.data.nsAccountId);
            }
            const id = savePaymentRecord(rec);
            log.debug('Customer payment saved with ID', id);

            return createSuccessResponse(context.action, id);
        } catch (e) {
            log.error('Error in PaymentService', e.name + ': ' + e.message);
            log.error('Error details', e);
            return createErrorResponse(e);
        }
    }

    return { handleRequest };
});
