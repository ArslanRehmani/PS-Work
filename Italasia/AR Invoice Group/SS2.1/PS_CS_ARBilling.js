/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @description AR Billing Client Script
 */
define(['N/currentRecord', 'N/url', 'N/runtime', 'N/format'], /**
 * @param {currentRecord} currentRecord
 * @param {url} url
 * @param {runtime} runtime
 * @param {format} format
 */ (currentRecord, url, runtime, format) => {
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    const pageInit = (scriptContext) => {
        const record = scriptContext.currentRecord;
        const sublistId = 'custpage_sublist';
        const lineCount = record.getLineCount({ sublistId });

        for (let i = 0; i < lineCount; i++) {
            const fieldObj = record.getSublistField({
                sublistId: sublistId,
                fieldId: 'custpage_select',
                line: i,
            });

            if (fieldObj) {
                fieldObj.isDisabled = false;
            }
        }
        calculateTotal();
    };

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
    const fieldChanged = (scriptContext) => {
        const record = scriptContext.currentRecord;
        const sublistId = scriptContext.sublistId;
        const fieldId = scriptContext.fieldId;

        if (sublistId === 'custpage_sublist' && (fieldId === 'custpage_select' || fieldId === 'custpage_billing_amount')) {
            calculateTotal();
        }
    };

    /**
     * Mark all checkboxes in the sublist
     */
    const markAll = () => {
        const record = currentRecord.get();
        const sublistId = 'custpage_sublist';
        const lineCount = record.getLineCount({ sublistId });

        for (let i = 0; i < lineCount; i++) {
            record.selectLine({
                sublistId: sublistId,
                line: i,
            });

            record.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'custpage_select',
                value: true,
            });

            record.commitLine({
                sublistId: sublistId,
            });
        }

        calculateTotal();
    };

    /**
     * Unmark all checkboxes in the sublist
     */
    const unmarkAll = () => {
        const record = currentRecord.get();
        const sublistId = 'custpage_sublist';
        const lineCount = record.getLineCount({ sublistId });

        for (let i = 0; i < lineCount; i++) {
            record.selectLine({
                sublistId: sublistId,
                line: i,
            });

            record.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'custpage_select',
                value: false,
            });

            record.commitLine({
                sublistId: sublistId,
            });
        }

        calculateTotal();
    };

    /**
     * Calculate total amount from selected transactions
     */
    const calculateTotal = () => {
        const record = currentRecord.get();
        const sublistId = 'custpage_sublist';
        const lineCount = record.getLineCount({ sublistId });
        let totalAmount = 0;

        for (let i = 0; i < lineCount; i++) {
            const isSelected = record.getSublistValue({
                sublistId: sublistId,
                fieldId: 'custpage_select',
                line: i,
            });

            if (isSelected === true || isSelected === 'T') {
                const billingAmount =
                    parseFloat(
                        record.getSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custpage_billing_amount',
                            line: i,
                        })
                    ) || 0;

                totalAmount += billingAmount;
            }
        }

        // Update total amount field
        record.setValue({
            fieldId: 'custpage_total_amount',
            value: totalAmount,
        });
    };

    /**
     * Navigate to the previous page
     */
    const prevPage = () => {
        const record = currentRecord.get();
        const pageIndex = parseInt(record.getValue({ fieldId: 'custpage_page_index' })) || 0;

        if (pageIndex > 0) {
            navigateToPage(pageIndex - 1);
        }
    };

    /**
     * Navigate to the next page
     */
    const nextPage = () => {
        const record = currentRecord.get();
        const pageIndex = parseInt(record.getValue({ fieldId: 'custpage_page_index' })) || 0;
        navigateToPage(pageIndex + 1);
    };

    /**
     * Navigate to a specific page
     * @param {Number} pageIndex - Page index to navigate to
     */
    const navigateToPage = (pageIndex) => {
        const record = currentRecord.get();

        const customerValues = record.getValue({ fieldId: 'custpage_customer' });
        const documentNumberValues = record.getValue({ fieldId: 'custpage_document_number' });
        const transactionDateFrom = record.getValue({ fieldId: 'custpage_transaction_date_from' }) || '';
        const transactionDateTo = record.getValue({ fieldId: 'custpage_transaction_date_to' }) || '';
        const dueDateFrom = record.getValue({ fieldId: 'custpage_due_date_from' }) || '';
        const dueDateTo = record.getValue({ fieldId: 'custpage_due_date_to' }) || '';
        const terms = record.getValue({ fieldId: 'custpage_terms' }) || '';

        let customer = '';
        let documentNumber = '';

        const params = {};

        if (customerValues && Array.isArray(customerValues) && customerValues.length > 0 && customerValues[0] !== '0') {
            customer = customerValues.join(',');
        }

        if (documentNumberValues && Array.isArray(documentNumberValues) && documentNumberValues.length > 0 && documentNumberValues[0] !== '0') {
            documentNumber = documentNumberValues.join(',');
        }

        if (customer && customer !== '0') {
            params.custpage_customer = customer;
        } else {
            delete params.custpage_customer;
        }

        if (documentNumber && documentNumber !== '0') {
            params.custpage_document_number = documentNumber;
        } else {
            delete params.custpage_document_number;
        }

        // Add other parameters
        params.custpage_transaction_date_from = formatDateForURL(transactionDateFrom);
        params.custpage_transaction_date_to = formatDateForURL(transactionDateTo);
        params.custpage_due_date_from = formatDateForURL(dueDateFrom);
        params.custpage_due_date_to = formatDateForURL(dueDateTo);
        params.custpage_terms = terms;
        params.custpage_page_index = pageIndex;

        // Navigate to the Suitelet with parameters
        const suiteletURL = url.resolveScript({
            scriptId: 'customscript_ps_sl_arbilling',
            deploymentId: 'customdeploy_ps_sl_arbilling',
            params: params,
        });

        window.onbeforeunload = null;
        window.location.href = suiteletURL;
    };

    /**
     * Refresh the page with current filter values
     */
    const refreshPage = () => {
        const record = currentRecord.get();

        const customerValues = record.getValue({ fieldId: 'custpage_customer' });
        const documentNumberValues = record.getValue({ fieldId: 'custpage_document_number' });
        const transactionDateFrom = record.getValue({ fieldId: 'custpage_transaction_date_from' }) || '';
        const transactionDateTo = record.getValue({ fieldId: 'custpage_transaction_date_to' }) || '';
        const dueDateFrom = record.getValue({ fieldId: 'custpage_due_date_from' }) || '';
        const dueDateTo = record.getValue({ fieldId: 'custpage_due_date_to' }) || '';
        const terms = record.getValue({ fieldId: 'custpage_terms' }) || '';

        let customer = '';
        let documentNumber = '';

        const params = {};

        if (customerValues && Array.isArray(customerValues) && customerValues.length > 0 && customerValues[0] !== '0') {
            customer = customerValues.join(',');
        }

        if (documentNumberValues && Array.isArray(documentNumberValues) && documentNumberValues.length > 0 && documentNumberValues[0] !== '0') {
            documentNumber = documentNumberValues.join(',');
        }

        if (customer && customer !== '0') {
            params.custpage_customer = customer;
        } else {
            delete params.custpage_customer;
        }

        if (documentNumber && documentNumber !== '0') {
            params.custpage_document_number = documentNumber;
        } else {
            delete params.custpage_document_number;
        }

        // Add other parameters
        params.custpage_transaction_date_from = formatDateForURL(transactionDateFrom);
        params.custpage_transaction_date_to = formatDateForURL(transactionDateTo);
        params.custpage_due_date_from = formatDateForURL(dueDateFrom);
        params.custpage_due_date_to = formatDateForURL(dueDateTo);
        params.custpage_terms = terms;
        params.custpage_page_index = 0;

        const suiteletURL = url.resolveScript({
            scriptId: 'customscript_ps_sl_arbilling',
            deploymentId: 'customdeploy_ps_sl_arbilling',
            params: params,
        });

        window.onbeforeunload = null;
        window.location.href = suiteletURL;
    };

    /**
     * Format date for URL parameter
     * @param {Date|String} dateValue - Date value to format
     * @returns {String} Formatted date string or empty string
     */
    const formatDateForURL = (dateValue) => {
        if (!dateValue) return '';

        try {
            if (typeof dateValue === 'string') {
                return dateValue;
            }

            return format.format({
                value: dateValue,
                type: format.Type.DATE,
            });
        } catch (e) {
            console.error('Error formatting date:', e);
            return '';
        }
    };

    /**
     * Navigate back to the main AR Billing page
     */
    const backToMain = () => {
        const suiteletURL = url.resolveScript({
            scriptId: 'customscript_ps_sl_arbilling',
            deploymentId: 'customdeploy_ps_sl_arbilling',
        });

        window.onbeforeunload = null;
        window.location.href = suiteletURL;
    };

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        markAll: markAll,
        unmarkAll: unmarkAll,
        prevPage: prevPage,
        nextPage: nextPage,
        refreshPage: refreshPage,
        backToMain: backToMain,
    };
});
