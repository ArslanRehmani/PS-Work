/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/record', 'N/search', './Utils/Validation', './Utils/Constants'], function (log, record, search, Validation, CONSTANTS) {
    const APPROVED_STATUS = 2;

    /**
     * Validates required vendor bill fields
     * @param {Object} billData - Vendor bill data object
     * @param {Object} context - Request context
     */
    function validateVendorBillFields(billData, context) {
        Validation.validateFields(billData, ['billId', 'subsidiary', 'department', 'class', 'nsVendorId', 'billNumber', 'transactionDate', 'currency', 'items']);

        if (!billData.items || !Array.isArray(billData.items) || billData.items.length === 0) {
            throw { code: 'ER-002', message: 'At least one item is required' };
        }

        billData.items.forEach((item, index) => {
            Validation.validateFields(item, ['nsItemId', 'quantity', 'rate', 'amount']);
        });

        if (!Validation.validateVendor(billData.nsVendorId)) {
            throw {
                code: 'ER-010',
                message: `Vendor with ID ${billData.nsVendorId} not found`,
            };
        }

        // Validate items exist
        for (let i = 0; i < billData.items.length; i++) {
            const item = billData.items[i];
            if (!Validation.validateItem(item.nsItemId)) {
                throw {
                    code: 'ER-014',
                    message: `Item with ID ${item.nsItemId} not found`,
                };
            }
        }

        log.debug(
            'Vendor Bill validation passed',
            JSON.stringify({
                billId: billData.billId,
                nsVendorId: billData.nsVendorId,
                itemCount: billData.items.length,
            })
        );
    }

    /**
     * Validates required fields for UPDATE action
     * @param {Object} billData - Vendor bill data object
     * @param {Object} context - Request context
     */
    function validateUpdateFields(billData, context) {
        Validation.validateFields(billData, ['nsBillId', 'transactionDate']);

        log.debug(
            'Vendor Bill update validation passed',
            JSON.stringify({
                nsBillId: billData.nsBillId,
                transactionDate: billData.transactionDate,
            })
        );
    }

    /**
     * Creates a vendor bill record
     * @returns {Object} - NetSuite record object
     */
    function createVendorBillRecord(billData) {
        return record.create({
            type: record.Type.VENDOR_BILL,
            // isDynamic: true,
            //  defaultValues: {
            //       entity: billData.nsVendorId,
            //   },
        });
    }

    /**
     * Updates a vendor bill record's transaction date
     * @param {String} billId - NetSuite vendor bill internal ID
     * @param {String} transactionDate - New transaction date in DD/MM/YYYY format
     * @returns {String} - Record ID
     */
    function updateVendorBillRecord(billId, transactionDate) {
        const formattedDate = formatDate(transactionDate);

        if (!formattedDate) {
            throw {
                code: 'ER-019',
                message: 'Invalid transaction date format. Expected DD/MM/YYYY',
            };
        }

        log.debug(
            'Updating vendor bill',
            JSON.stringify({
                billId: billId,
                newTransactionDate: transactionDate,
                formattedDate: formattedDate,
            })
        );

        return record.submitFields({
            type: record.Type.VENDOR_BILL,
            id: billId,
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
            log.debug({
                title: 'dateString AR',
                details: dateString
            });
            const parts = dateString.split('/');
            if (parts.length !== 3) {
                log.error('Invalid date format', dateString);
                return null;
            }
            log.debug({
                title: 'dateString AR123',
                details: new Date(parts[2], parts[1] - 1, parts[0])
            });
            return new Date(parts[2], parts[1] - 1, parts[0]);
        } catch (e) {
            log.error('Error formatting date', e);
            return null;
        }
    }

    /**
     * Gets primary bank detail for a vendor
     * @param {String} vendorId - Vendor internal ID
     * @returns {String|null} - Primary bank detail ID or null if not found
     */
    function getPrimaryBankDetail(vendorId) {
        try {
            if (!vendorId) return null;

            const bankDetailSearch = search.create({
                type: 'customrecord_ps_bank_detail_record',
                filters: [['custrecord_ps_vendor_name', 'anyof', vendorId], 'AND', ['custrecord_ps_primary_bank', 'is', 'T']],
                columns: [search.createColumn({ name: 'internalid', label: 'Internal ID' }), search.createColumn({ name: 'name', label: 'Name' })],
            });

            let primaryBankDetailId = null;
            bankDetailSearch.run().each(function (result) {
                primaryBankDetailId = result.id;
                log.debug('Found primary bank detail', {
                    vendorId: vendorId,
                    bankDetailId: primaryBankDetailId,
                    bankDetailName: result.getValue('name'),
                });
                return false; // Get only the first result
            });

            return primaryBankDetailId;
        } catch (e) {
            log.error('Error getting primary bank detail', {
                vendorId: vendorId,
                error: e.name + ': ' + e.message,
            });
            return null;
        }
    }

    /**
     * Sets base header fields on vendor bill record
     * @param {Object} rec - NetSuite record object
     * @param {Object} billData - Vendor bill data object
     * @returns {Object} - Updated NetSuite record
     */
    function setHeaderFields(rec, billData) {
        rec.setValue('customform', CONSTANTS.CUSTOM_FORMS.TRADE_VENDOR_BILL);

        rec.setValue("entity", billData.nsVendorId);

        rec.setValue('custbody_ps_hms_bill_id', billData.billId);
        rec.setValue('tranid', billData.billNumber);

        rec.setValue('account', parseInt(billData.nsApAccount));

        const transactionDate = formatDate(billData.transactionDate);
        const paymentValueDate = formatDate(billData.psPaymentValueDate);
        if (transactionDate) {
            rec.setValue('trandate', transactionDate);
        }

        const currencyMap = {
            MYR: 1,
            USD: 2,
            SGD: 6,
            IDR: 7,
        };
        const currencyId = currencyMap[billData.currency] || 1;
        rec.setValue('subsidiary', billData.subsidiary);
        rec.setValue('department', billData.department);
        rec.setValue('class', billData.class);
        rec.setValue('currency', currencyId);
        if (billData.fromAccount) rec.setValue('custbody_ps_payment_account', billData.fromAccount);
        if (paymentValueDate) rec.setValue('custbody_payment_date_value', paymentValueDate);
        if (billData.psBankDetails) {
            log.debug('bankdetail', true);
            rec.setValue('custbody_ps_bank_detail_shadow', billData.psBankDetails);
        }
        if (billData.bankChargeBearer) rec.setValue('custbody_bank_charge_bearer', billData.bankChargeBearer);

        // const primaryBankDetailId = getPrimaryBankDetail(billData.nsVendorId);
        // log.debug("primaryBankDetailId", primaryBankDetailId);
        // if (primaryBankDetailId) {
        //   log.debug("Setting primary bank detail automatically", {
        //     vendorId: billData.nsVendorId,
        //     bankDetailId: primaryBankDetailId,
        //   });
        //   rec.setValue("custbody_ps_bank_detail", primaryBankDetailId);
        // } else {
        //   log.debug("No primary bank detail found for vendor", {
        //     vendorId: billData.nsVendorId,
        //   });
        // }

        if (billData.memo) {
            rec.setValue('memo', billData.memo);
        }

        rec.setValue('approvalstatus', APPROVED_STATUS);
        return rec;
    }

    /**
     * Sets item line fields on vendor bill record
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

                if (item.customerId) {
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'customer',
                        value: item.customerId,
                    });
                }

                rec.commitLine({
                    sublistId: 'item',
                });
            } catch (e) {
                log.error(`Error setting item ${index}`, e.name + ': ' + e.message);
                log.error('Error details', e);
                throw {
                    code: 'ITEM_ERROR',
                    message: `Error adding item ${index}: ${e.message}`,
                };
            }
        });

        return rec;
    }

    /**
     * Saves the vendor bill record
     * @param {Object} rec - NetSuite record object
     * @returns {String} - Record ID
     */
    function saveVendorBillRecord(rec) {
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
            message: `Vendor Bill ${action.toLowerCase()}d successfully`,
            nsBillId: id,
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
     * Main handler function for vendor bill requests
     * @param {Object} context - Request context
     * @returns {Object} - Response object
     */
    function handleRequest(context) {
        try {
            log.debug('handleRequest - Vendor Bill', JSON.stringify(context));

            const action = context.action || 'CREATE';

            if (action === 'UPDATE') {
                // Handle UPDATE action
                validateUpdateFields(context.data, context);

                log.debug('Updating vendor bill record');
                const id = updateVendorBillRecord(context.data.nsBillId, context.data.transactionDate);
                log.debug('Vendor bill updated with ID', id);

                return createSuccessResponse(action, id);
            } else if (action === 'CREATE') {
                // Handle CREATE action
                validateVendorBillFields(context.data, context);

                log.debug('Creating vendor bill record');
                const rec = createVendorBillRecord(context.data);

                log.debug('Setting header fields');
                setHeaderFields(rec, context.data);

                log.debug('Setting item fields');
                setItemFields(rec, context.data.items);

                log.debug('Saving vendor bill record');
                const id = saveVendorBillRecord(rec);
                log.debug('Vendor bill saved with ID', id);

                return createSuccessResponse(action, id);
            } else {
                throw {
                    code: 'ER-020',
                    message: `Invalid action: ${action}. Supported actions are CREATE and UPDATE`,
                };
            }
        } catch (e) {
            log.error('Error in VendorBillService', e.name + ': ' + e.message);
            log.error('Error details', e);
            return createErrorResponse(e);
        }
    }

    return { handleRequest };
});
