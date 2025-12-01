/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @description Client script for Customer Payment to auto-apply AR Billing
 */
define(['N/search', 'N/record', 'N/ui/message'], /**
 * @param {search} search
 * @param {record} record
 * @param {message} message
 */ function (search, record, message) {
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {}

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
        try {
            const currentRecord = scriptContext.currentRecord;
            const fieldId = scriptContext.fieldId;

            if (fieldId === 'custbody_its_ar_applybilling') {
                const billingHeaderId = currentRecord.getValue({
                    fieldId: 'custbody_its_ar_applybilling',
                });
                if (billingHeaderId) {
                    applyBillingToPayment(currentRecord, billingHeaderId);
                }
            }
        } catch (error) {
            console.error('Error in fieldChanged:', error);
            showMessage({
                type: message.Type.ERROR,
                title: 'Error',
                message: 'An error occurred while applying the billing: ' + error.message,
            });
        }
    }

    /**
     * Applies the selected billing to the payment
     * @param {Record} currentRecord - Current form record
     * @param {string} billingHeaderId - ID of the selected billing header
     */
    function applyBillingToPayment(currentRecord, billingHeaderId) {
        console.log('applyBillingToPayment', billingHeaderId);
        // First, search for billing detail records related to the selected header
        const billingDetails = searchBillingDetails(currentRecord, billingHeaderId);

        if (!billingDetails || billingDetails.length === 0) {
            showMessage({
                type: message.Type.WARNING,
                title: 'No Details Found',
                message: 'No billing details found for the selected billing.',
            });
            return;
        }

        // Clear any existing applications first
        // clearExistingApplications(currentRecord);

        let appliedCount = 0;

        billingDetails.forEach(function (detail) {
            const transactionId = detail.transactionId;
            const billingAmount = detail.billingAmount;
            const documentType = detail.documentType;

            const sublistId = documentType === 1 ? 'apply' : 'credit';
            const lineIndex = findSublistLineWithValue(currentRecord, sublistId, 'doc', transactionId);
            console.log('lineIndex', lineIndex);
            if (lineIndex !== -1) {
                currentRecord.selectLine({
                    sublistId: sublistId,
                    line: lineIndex,
                });
                currentRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'apply',
                    value: true,
                });
                currentRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'amount',
                    value: billingAmount,
                });
                currentRecord.commitLine({
                    sublistId: sublistId,
                });

                appliedCount++;
            }
        });

        if (appliedCount > 0) {
            showMessage({
                type: message.Type.CONFIRMATION,
                title: 'Success',
                message: `Successfully applied ${appliedCount} transactions from the selected billing.`,
            });
        } else {
            showMessage({
                type: message.Type.WARNING,
                title: 'No Matches Found',
                message: 'None of the billing details could be matched to open transactions.',
            });
        }
    }

    /**
     * Searches for billing details related to a billing header
     * @param {Record} currentRecord - Current form record
     * @param {string} billingHeaderId - ID of the billing header
     * @returns {Array} Array of billing detail objects
     */
    function searchBillingDetails(currentRecord, billingHeaderId) {
        const billingDetails = [];

        const customerId = currentRecord.getValue({
            fieldId: 'customer',
        });

        if (!customerId) {
            showMessage({
                type: message.Type.WARNING,
                title: 'Missing Customer',
                message: 'Please select a customer before applying an AR Billing.',
            });
            return billingDetails;
        }

        const detailSearch = search.create({
            type: 'customrecord_itl_ar_billing_detail',//
            filters: [['custrecord_itl_ar_billing_detail_parent', 'anyof', billingHeaderId], 'AND', ['custrecord_itl_ar_billing_detail_custome', 'anyof', customerId]],
            columns: [
                search.createColumn({ name: 'custrecord_itl_ar_billing_detail_doc_no' }),
                search.createColumn({ name: 'custrecord_itl_ar_billing_detail_doc_typ' }),
                search.createColumn({ name: 'custrecord_itl_ar_billing_detail_billing' }),
            ],
        });

        detailSearch.run().each(function (result) {
            billingDetails.push({
                transactionId: result.getValue({ name: 'custrecord_itl_ar_billing_detail_doc_no' }),
                documentType: parseInt(result.getValue({ name: 'custrecord_itl_ar_billing_detail_doc_typ' })),
                billingAmount: parseFloat(result.getValue({ name: 'custrecord_itl_ar_billing_detail_billing' })),
            });

            return true;
        });
        console.log('billingDetails', billingDetails);

        return billingDetails;
    }

    /**
     * Finds a line in a sublist that has a specific value in a specific field
     * @param {Record} currentRecord - Current form record
     * @param {string} sublistId - ID of the sublist
     * @param {string} fieldId - ID of the field to check
     * @param {*} value - Value to look for
     * @returns {number} Line index if found, -1 if not found
     */
    function findSublistLineWithValue(currentRecord, sublistId, fieldId, value) {
        const lineCount = currentRecord.getLineCount({ sublistId: sublistId });
        console.log('lineCount', lineCount);
        

        for (let i = 0; i < lineCount; i++) {
            const lineValue = currentRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: fieldId,
                line: i,
            });
            console.log('lineValue', lineValue);
            console.log('value', value);

            if (lineValue == value) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Clears any existing applications in both apply and credit sublists
     * @param {Record} currentRecord - Current form record
     */
    function clearExistingApplications(currentRecord) {
        const applyLineCount = currentRecord.getLineCount({ sublistId: 'apply' });
        for (let i = 0; i < applyLineCount; i++) {
            currentRecord.selectLine({
                sublistId: 'apply',
                line: i,
            });

            currentRecord.setCurrentSublistValue({
                sublistId: 'apply',
                fieldId: 'apply',
                value: false,
            });

            currentRecord.commitLine({
                sublistId: 'apply',
            });
        }

        const creditLineCount = currentRecord.getLineCount({ sublistId: 'credit' });
        for (let i = 0; i < creditLineCount; i++) {
            currentRecord.selectLine({
                sublistId: 'credit',
                line: i,
            });

            currentRecord.setCurrentSublistValue({
                sublistId: 'credit',
                fieldId: 'apply',
                value: false,
            });

            currentRecord.commitLine({
                sublistId: 'credit',
            });
        }
    }

    /**
     * Shows a message to the user
     * @param {Object} options - Message options
     * @param {string} options.type - Message type
     * @param {string} options.title - Message title
     * @param {string} options.message - Message content
     */
    function showMessage(options) {
        const msgObj = message.create({
            type: options.type,
            title: options.title,
            message: options.message,
        });

        msgObj.show({
            duration: 5000,
        });
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
    };
});
