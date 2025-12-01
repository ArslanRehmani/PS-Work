/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @description AR Billing (Grouping Invoices) Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/format', 'N/runtime', 'N/url', 'N/redirect', 'N/record', 'N/ui/message'], /**
 * @param {serverWidget} serverWidget
 * @param {search} search
 * @param {format} format
 * @param {runtime} runtime
 * @param {url} url
 * @param {redirect} redirect
 * @param {record} record
 * @param {message} message
 */ (serverWidget, search, format, runtime, url, redirect, record, message) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            try {
                if (scriptContext.request.method === 'GET') {
                    handleGetRequest(scriptContext);
                } else {
                    handlePostRequest(scriptContext);
                }
            } catch (e) {
                log.error({
                    title: 'Error in AR Billing Suitelet',
                    details: e.toString(),
                });
                let form = serverWidget.createForm({
                    title: 'AR Billing - Error',
                });
                form.addField({
                    id: 'custpage_error',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: ' ',
                }).defaultValue = '<h1>An error occurred</h1><p>' + e.toString() + '</p>';
                scriptContext.response.writePage(form);
            }
        };

        /**
         * Handles the GET request
         * @param {Object} scriptContext
         */
        const handleGetRequest = (scriptContext) => {
            const request = scriptContext.request;
            const response = scriptContext.response;

            // Create form
            const form = serverWidget.createForm({
                title: 'AR Billing (Grouping Invoices)',
            });

            // Add client script
            // form.clientScriptModulePath = 'SuiteScripts/Pointstar Customizations/AR Invoice Group/SS2.1/PS_CS_ARBilling.js';
            form.clientScriptFileId = 535;

            const customer = request.parameters.custpage_customer || '';
            const documentNumber = request.parameters.custpage_document_number || '';
            const transactionDateFrom = request.parameters.custpage_transaction_date_from || '';
            const transactionDateTo = request.parameters.custpage_transaction_date_to || '';
            const dueDateFrom = request.parameters.custpage_due_date_from || '';
            const dueDateTo = request.parameters.custpage_due_date_to || '';
            const terms = request.parameters.custpage_terms || '';
            const pageIndex = parseInt(request.parameters.custpage_page_index || '0');

            const filterGroup1 = form.addFieldGroup({
                id: 'custpage_filter_group1',
                label: 'Invoice/Credit Memos Transaction Search',
            });

            // Create Transaction Date group
            const transDateGroup = form.addFieldGroup({
                id: 'custpage_trans_date_group',
                label: 'Transaction Date',
            });
            transDateGroup.isSingleColumn = false;
            transDateGroup.isCollapsible = true;
            transDateGroup.isCollapsed = false;

            // Create Due Date group
            const dueDateGroup = form.addFieldGroup({
                id: 'custpage_due_date_group',
                label: 'Due Date',
            });
            dueDateGroup.isSingleColumn = false;
            dueDateGroup.isCollapsible = true;
            dueDateGroup.isCollapsed = false;

            const customerField = form.addField({
                id: 'custpage_customer',
                type: serverWidget.FieldType.MULTISELECT,
                label: 'Customer',
                source: 'customer',
                container: 'custpage_filter_group1',
            });

            if (request.parameters && request.parameters.custpage_customer) {
                let customerValues;
                if (request.parameters.custpage_customer.indexOf(',') !== -1) {
                    customerValues = request.parameters.custpage_customer.split(',');
                } else {
                    customerValues = [request.parameters.custpage_customer];
                }
                customerField.defaultValue = customerValues;
                log.debug('Setting customer default value', customerValues);
            }

            const documentNumberField = form.addField({
                id: 'custpage_document_number',
                type: serverWidget.FieldType.MULTISELECT,
                label: 'Document Number',
                container: 'custpage_filter_group1',
            });

            // search to get all document numbers for invoices and credit memos
            const docNumberSearch = search.create({
                type: 'transaction',
                filters: [
                    ['type', 'anyof', 'CustInvc', 'CustCred'],
                    'AND',
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['taxline', 'is', 'F'],
                    'AND',
                    ['shipping', 'is', 'F'],
                    'AND',
                    ['amountremaining', 'greaterthan', '0.00'],
                ],
                columns: ['internalid', 'tranid'],
            });

            const docNumberSet = new Set();
            const pagedData = docNumberSearch.runPaged({
                pageSize: 1000,
            });

            if (pagedData.pageRanges.length > 0) {
                const page = pagedData.fetch({
                    index: 0,
                });

                page.data.forEach(function (result) {
                    const internalId = result.getValue('internalid');
                    const tranId = result.getValue('tranid');
                    if (tranId && !docNumberSet.has(tranId)) {
                        docNumberSet.add(tranId);
                        documentNumberField.addSelectOption({
                            value: internalId,
                            text: tranId,
                        });
                    }
                });

                if (pagedData.pageRanges.length > 1) {
                    log.audit('Document Number Search', 'More than 1000 document numbers found. Only the first 1000 are displayed.');
                }
            }

            if (request.parameters && request.parameters.custpage_document_number) {
                let documentNumberValues;
                if (request.parameters.custpage_document_number.indexOf(',') !== -1) {
                    documentNumberValues = request.parameters.custpage_document_number.split(',');
                } else {
                    documentNumberValues = [request.parameters.custpage_document_number];
                }
                documentNumberField.defaultValue = documentNumberValues;
                log.debug('Setting document number default value', documentNumberValues);
            }

            const termsField = form.addField({
                id: 'custpage_terms',
                type: serverWidget.FieldType.SELECT,
                label: 'Terms',
                source: 'term',
                container: 'custpage_filter_group1',
            });
            if (terms) termsField.defaultValue = terms;

            const transactionDateFromField = form.addField({
                id: 'custpage_transaction_date_from',
                type: serverWidget.FieldType.DATE,
                label: 'From',
                container: 'custpage_trans_date_group',
            });
            if (transactionDateFrom) transactionDateFromField.defaultValue = transactionDateFrom;

            const transactionDateToField = form.addField({
                id: 'custpage_transaction_date_to',
                type: serverWidget.FieldType.DATE,
                label: 'To',
                container: 'custpage_trans_date_group',
            });
            if (transactionDateTo) transactionDateToField.defaultValue = transactionDateTo;

            const dueDateFromField = form.addField({
                id: 'custpage_due_date_from',
                type: serverWidget.FieldType.DATE,
                label: 'From',
                container: 'custpage_due_date_group',
            });
            if (dueDateFrom) dueDateFromField.defaultValue = dueDateFrom;

            const dueDateToField = form.addField({
                id: 'custpage_due_date_to',
                type: serverWidget.FieldType.DATE,
                label: 'To',
                container: 'custpage_due_date_group',
            });
            if (dueDateTo) dueDateToField.defaultValue = dueDateTo;

            const filterGroup2 = form.addFieldGroup({
                id: 'custpage_filter_group2',
                label: 'Billing Information Entry',
            });

            const billingDateField = form.addField({
                id: 'custpage_billing_date',
                type: serverWidget.FieldType.DATE,
                label: 'Billing Date',
                container: 'custpage_filter_group2',
            });
            billingDateField.isMandatory = true;

            // Set default value to today's date
            const today = new Date();
            const formattedToday = format.format({
                value: today,
                type: format.Type.DATE,
            });
            billingDateField.defaultValue = formattedToday;

            const billingDueDateField = form.addField({
                id: 'custpage_billing_due_date',
                type: serverWidget.FieldType.DATE,
                label: 'Billing Due Date',
                container: 'custpage_filter_group2',
            });

            const totalAmountField = form.addField({
                id: 'custpage_total_amount',
                type: serverWidget.FieldType.CURRENCY,
                label: 'Total Amount',
                container: 'custpage_filter_group2',
            });
            totalAmountField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            // Add hidden fields for pagination
            form
                .addField({
                    id: 'custpage_page_index',
                    type: serverWidget.FieldType.INTEGER,
                    label: 'Page Index',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN,
                }).defaultValue = pageIndex.toString();

            // Add buttons
            form.addButton({
                id: 'custpage_refresh',
                label: 'Refresh',
                functionName: 'refreshPage',
            });

            form.addSubmitButton({
                label: 'Generate',
            });

            // Create sublist for transaction details
            const sublist = form.addSublist({
                id: 'custpage_sublist',
                type: serverWidget.SublistType.LIST,
                label: 'Transaction Details',
            });

            // Add mark all and unmark all buttons
            sublist.addButton({
                id: 'custpage_mark_all',
                label: 'Mark All',
                functionName: 'markAll',
            });

            sublist.addButton({
                id: 'custpage_unmark_all',
                label: 'Unmark All',
                functionName: 'unmarkAll',
            });

            // Add columns to sublist
            sublist.addField({
                id: 'custpage_select',
                type: serverWidget.FieldType.CHECKBOX,
                label: 'Select',
            });

            sublist
                .addField({
                    id: 'custpage_internal_id',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Internal ID',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN,
                });

            sublist
                .addField({
                    id: 'custpage_customer_id',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Customer ID',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN,
                });

            sublist
                .addField({
                    id: 'custpage_terms_id',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Terms ID',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN,
                });

            sublist
                .addField({
                    id: 'custpage_currency_id',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Currency ID',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN,
                });

            sublist.addField({
                id: 'custpage_customer_name',
                type: serverWidget.FieldType.TEXT,
                label: 'Customer',
            });

            sublist.addField({
                id: 'custpage_terms_name',
                type: serverWidget.FieldType.TEXT,
                label: 'Terms',
            });

            sublist.addField({
                id: 'custpage_document_no',
                type: serverWidget.FieldType.TEXT,
                label: 'Document No',
            });

            sublist.addField({
                id: 'custpage_document_type',
                type: serverWidget.FieldType.TEXT,
                label: 'Document Type',
            });

            sublist.addField({
                id: 'custpage_document_date',
                type: serverWidget.FieldType.DATE,
                label: 'Document Date',
            });

            sublist.addField({
                id: 'custpage_document_due_date',
                type: serverWidget.FieldType.DATE,
                label: 'Document Due Date',
            });

            sublist.addField({
                id: 'custpage_currency',
                type: serverWidget.FieldType.TEXT,
                label: 'Currency',
            });

            sublist.addField({
                id: 'custpage_original_amount',
                type: serverWidget.FieldType.CURRENCY,
                label: 'Original Amount',
            });

            sublist.addField({
                id: 'custpage_billed_amount',
                type: serverWidget.FieldType.CURRENCY,
                label: 'Billed Amount',
            });

            sublist.addField({
                id: 'custpage_remaining_amount',
                type: serverWidget.FieldType.CURRENCY,
                label: 'Remaining Amount',
            });

            const billingAmountField = sublist.addField({
                id: 'custpage_billing_amount',
                type: serverWidget.FieldType.CURRENCY,
                label: 'Billing Amount',
            });

            billingAmountField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.ENTRY,
            });

            sublist.addField({
                id: 'custpage_createdfrom',
                type: serverWidget.FieldType.TEXT,
                label: 'Created From',
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN,
            });
            sublist.addField({
                id: 'custpage_createdfromtext',
                type: serverWidget.FieldType.TEXT,
                label: 'Created From Text',
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN,
            });


            const searchResults = performSearch(customer, documentNumber, transactionDateFrom, transactionDateTo, dueDateFrom, dueDateTo, terms, pageIndex);
            log.debug('searchResults===', searchResults.results);

            // Add pagination buttons based on search results
            if (pageIndex > 0) {
                sublist.addButton({
                    id: 'custpage_prev_page',
                    label: 'Previous',
                    functionName: 'prevPage',
                });
            }

            // Only add Next button if there are more pages
            if (searchResults.hasMore) {
                sublist.addButton({
                    id: 'custpage_next_page',
                    label: 'Next',
                    functionName: 'nextPage',
                });
            }

            populateSublist(sublist, searchResults.results, searchResults.hasMore);

            response.writePage(form);
        };

        /**
         * Handles the POST request
         * @param {Object} scriptContext
         */
        const handlePostRequest = (scriptContext) => {
            const request = scriptContext.request;
            const response = scriptContext.response;

            try {
                const billingDate = request.parameters.custpage_billing_date;
                const billingDueDate = request.parameters.custpage_billing_due_date;

                if (!billingDate) {
                    return showErrorPage(response, 'Billing Date is required');
                }

                const selectedTransactions = [];
                const lineCount = request.getLineCount({
                    group: 'custpage_sublist',
                });

                for (let i = 0; i < lineCount; i++) {
                    const isSelected =
                        request.getSublistValue({
                            group: 'custpage_sublist',
                            name: 'custpage_select',
                            line: i,
                        }) === 'T';

                    if (isSelected) {
                        const internalId = request.getSublistValue({
                            group: 'custpage_sublist',
                            name: 'custpage_internal_id',
                            line: i,
                        });

                        const customerId = request.getSublistValue({
                            group: 'custpage_sublist',
                            name: 'custpage_customer_id',
                            line: i,
                        });

                        const termsId = request.getSublistValue({
                            group: 'custpage_sublist',
                            name: 'custpage_terms_id',
                            line: i,
                        });

                        const currencyId = request.getSublistValue({
                            group: 'custpage_sublist',
                            name: 'custpage_currency_id',
                            line: i,
                        });

                        const documentNo = request.getSublistValue({
                            group: 'custpage_sublist',
                            name: 'custpage_document_no',
                            line: i,
                        });

                        const documentType = request.getSublistValue({
                            group: 'custpage_sublist',
                            name: 'custpage_document_type',
                            line: i,
                        });

                        const documentDate = request.getSublistValue({
                            group: 'custpage_sublist',
                            name: 'custpage_document_date',
                            line: i,
                        });

                        const documentDueDate = request.getSublistValue({
                            group: 'custpage_sublist',
                            name: 'custpage_document_due_date',
                            line: i,
                        });

                        const originalAmount =
                            parseFloat(
                                request.getSublistValue({
                                    group: 'custpage_sublist',
                                    name: 'custpage_original_amount',
                                    line: i,
                                })
                            ) || 0;

                        const billedAmount =
                            parseFloat(
                                request.getSublistValue({
                                    group: 'custpage_sublist',
                                    name: 'custpage_billed_amount',
                                    line: i,
                                })
                            ) || 0;

                        const remainingAmount =
                            parseFloat(
                                request.getSublistValue({
                                    group: 'custpage_sublist',
                                    name: 'custpage_remaining_amount',
                                    line: i,
                                })
                            ) || 0;

                        const billingAmount =
                            parseFloat(
                                request.getSublistValue({
                                    group: 'custpage_sublist',
                                    name: 'custpage_billing_amount',
                                    line: i,
                                })
                            ) || 0;
                        const createdFrom = request.getSublistValue({
                            group: 'custpage_sublist',
                            name: 'custpage_createdfrom',
                            line: i,
                        });
                        const createdFromText = request.getSublistValue({
                            group: 'custpage_sublist',
                            name: 'custpage_createdfromtext',
                            line: i,
                        })

                        selectedTransactions.push({
                            internalId: internalId,
                            customerId: customerId,
                            termsId: termsId,
                            currencyId: currencyId,
                            documentNo: documentNo,
                            documentType: documentType,
                            documentDate: documentDate,
                            documentDueDate: documentDueDate,
                            originalAmount: originalAmount,
                            billedAmount: billedAmount,
                            remainingAmount: remainingAmount,
                            billingAmount: billingAmount,
                            createdFrom: createdFrom,
                            createdFromText: createdFromText,
                        });
                    }
                }

                if (selectedTransactions.length === 0) {
                    return showErrorPage(response, 'No transactions selected. Please select at least one transaction.');
                }

                try {
                    // Get unique customer IDs from selected transactions
                    const uniqueCustomerIds = [...new Set(selectedTransactions.map((transaction) => transaction.customerId))];

                    // Create a map to store customer names
                    const customerNameMap = {};

                    // Look up customer names using a search
                    if (uniqueCustomerIds.length > 0) {
                        const customerSearch = search.create({
                            type: 'customer',
                            filters: [['internalid', 'anyof', uniqueCustomerIds]],
                            columns: ['entityid', 'altname'],
                        });

                        customerSearch.run().each(function (result) {
                            const customerId = result.id;
                            const entityId = result.getValue('entityid');
                            const altName = result.getValue('altname');
                            customerNameMap[customerId] = `${entityId} ${altName}`;
                            return true;
                        });
                    }

                    // Add customer names to selected transactions
                    selectedTransactions.forEach((transaction) => {
                        transaction.customerText = customerNameMap[transaction.customerId] || 'Customer ' + transaction.customerId;
                    });

                    // Group transactions by customer, terms, and currency
                    const groupedData = {};

                    // Sort the selected transactions by document type and document number
                    // selectedTransactions.sort((a, b) => {
                    //     if (a.documentType !== b.documentType) {
                    //         if (a.documentType === 'Invoice') return -1;
                    //         if (b.documentType === 'Invoice') return 1;
                    //     }
                    //     return a.documentNo.localeCompare(b.documentNo);
                    // });
log.debug('selectedTransactions===', selectedTransactions);
                    // Group transactions by customer, terms, and currency
                    selectedTransactions.forEach((transaction) => {
                        const groupKey = `${transaction.customerId}_${transaction.termsId}_${transaction.currencyId}`;
                        log.audit('groupKey', groupKey);

                        if (!groupedData[groupKey]) {
                            // Create new group
                            groupedData[groupKey] = {
                                customerId: transaction.customerId,
                                termsId: transaction.termsId,
                                currencyId: transaction.currencyId,
                                transactions: [],
                            };
                        }
                        log.debug('transaction===', transaction);

                        // Add transaction to the group
                        groupedData[groupKey].transactions.push(transaction);
                    });

                    // Parse billing date once to reuse for all header records
                    let parsedBillingDate;
                    try {
                        parsedBillingDate = format.parse({
                            value: billingDate,
                            type: format.Type.DATE,
                        });
                    } catch (dateError) {
                        throw new Error(`Invalid Billing Date format: ${dateError.message}. Please use format DD/MM/YYYY.`);
                    }

                    // Parse billing due date if provided
                    let parsedDueDate;
                    if (billingDueDate) {
                        try {
                            parsedDueDate = format.parse({
                                value: billingDueDate,
                                type: format.Type.DATE,
                            });
                        } catch (dateError) {
                            throw new Error(`Invalid Billing Due Date format: ${dateError.message}. Please use format DD/MM/YYYY.`);
                        }
                    }

                    let totalDetailCount = 0;
                    const headerRecordIds = [];
                    const billingNumbers = [];

                    log.debug('groupedData', groupedData);

                    // Create a header record for each group
                    Object.values(groupedData).forEach((group) => {
                        // Generate a unique billing number for each header record
                        const billingNo = generateBillingNumber();
                        billingNumbers.push(billingNo);

                        // Create header record for this group
                        const headerRecord = record.create({
                            type: 'customrecord_itl_ar_billing_gen',
                            isDynamic: true,
                        });

                        // Get the first transaction in the group to get customer information
                        const firstTransaction = group.transactions[0];
                        const customerText = firstTransaction.customerText || '';

                        // Set header record fields
                        headerRecord.setValue({
                            fieldId: 'name',
                            value: billingNo,
                        });

                        headerRecord.setValue({
                            fieldId: 'custrecord_itl_ar_billing_billing_no',
                            value: billingNo,
                        });

                        // Set customer ID on the header record
                        headerRecord.setValue({
                            fieldId: 'custrecord_itl_ar_billing_customer',
                            value: firstTransaction.customerId,
                        });

                        headerRecord.setValue({
                            fieldId: 'custrecord_itl_ar_billing_date',
                            value: parsedBillingDate,
                        });

                        if (parsedDueDate) {
                            headerRecord.setValue({
                                fieldId: 'custrecord_itl_ar_billing_due_date',
                                value: parsedDueDate,
                            });
                        }

                        // Process each transaction in the group
                        group.transactions.forEach((transaction) => {
                            headerRecord.selectNewLine({
                                sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                            });

                            headerRecord.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                                fieldId: 'custrecord_itl_ar_billing_detail_custome',
                                value: transaction.customerId,
                            });

                            if (transaction.termsId) {
                                headerRecord.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                                    fieldId: 'custrecord_itl_ar_billing_detail_terms',
                                    value: transaction.termsId,
                                });
                            }

                            headerRecord.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                                fieldId: 'custrecord_itl_ar_billing_detail_doc_no',
                                value: transaction.internalId,
                            });

                            // const docTypeValue = transaction.documentType === 'Invoice' ? 1 : 2;
                            if(transaction.documentType){
                                headerRecord.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                                    fieldId: 'custrecord_itl_ar_billing_detail_doc_typ',
                                    value: transaction.documentType,
                                });
                            }
                            // if (transaction.createdFromText) {
                            //     log.debug('transaction.createdFromText===', transaction.createdFromText);
                            //     headerRecord.setCurrentSublistValue({
                            //         sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                            //         fieldId: 'custrecord_itl_ar_billing_detail_doc_typ',
                            //         value: (transaction.createdFromText).split('#')[0].trim(),
                            //     });//AR
                            // }
                            if (transaction.createdFrom) {
                                headerRecord.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                                    fieldId: 'custrecord_itl_ar_billing_detail_ref_no',
                                    value: transaction.createdFrom,
                                });
                            }

                            if (transaction.documentDate) {
                                try {
                                    const parsedDocDate = format.parse({
                                        value: transaction.documentDate,
                                        type: format.Type.DATE,
                                    });

                                    headerRecord.setCurrentSublistValue({
                                        sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                                        fieldId: 'custrecord_itl_ar_billing_detail_date',
                                        value: parsedDocDate,
                                    });
                                } catch (dateError) {
                                    log.error('Error parsing document date', dateError);
                                }
                            }

                            // Use billing due date if provided, otherwise use transaction's due date
                            if (parsedDueDate) {
                                headerRecord.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                                    fieldId: 'custrecord_itl_ar_billing_detail_duedate',
                                    value: parsedDueDate,
                                });
                            } else if (transaction.documentDueDate) {
                                try {
                                    const parsedDocDueDate = format.parse({
                                        value: transaction.documentDueDate,
                                        type: format.Type.DATE,
                                    });

                                    headerRecord.setCurrentSublistValue({
                                        sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                                        fieldId: 'custrecord_itl_ar_billing_detail_duedate',
                                        value: parsedDocDueDate,
                                    });
                                } catch (dateError) {
                                    log.error('Error parsing document due date', dateError);
                                }
                            }

                            if (transaction.currencyId) {
                                headerRecord.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                                    fieldId: 'custrecord_itl_ar_billing_detail_curren',
                                    value: transaction.currencyId,
                                });
                            }

                            headerRecord.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                                fieldId: 'custrecord_itl_ar_billing_detail_amount',
                                value: transaction.originalAmount,
                            });

                            headerRecord.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                                fieldId: 'custrecord_itl_ar_billing_detail_billed',
                                value: transaction.billedAmount,
                            });

                            headerRecord.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                                fieldId: 'custrecord_itl_ar_billing_detail_remain',
                                value: transaction.remainingAmount,
                            });

                            headerRecord.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                                fieldId: 'custrecord_itl_ar_billing_detail_billing',
                                value: transaction.billingAmount,
                            });
                            headerRecord.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                                fieldId: 'custrecord_itl_ar_billing_detail_billing',
                                value: transaction.billingAmount,
                            });

                            headerRecord.commitLine({
                                sublistId: 'recmachcustrecord_itl_ar_billing_detail_parent',
                            });
                            totalDetailCount++;
                        });

                        // Save the header record for this group
                        const headerId = headerRecord.save();
                        headerRecordIds.push(headerId);
                    });

                    // Update selected transaction due date if billing due date has value
                    if (billingDueDate && parsedDueDate) {
                        log.debug('Updating original transactions with new due date', billingDueDate);

                        // Process all selected transactions
                        selectedTransactions.forEach((transaction) => {
                            try {
                                const isCredMemo = transaction.documentType === 'Credit Memo';

                                // For invoices, update the duedate field
                                // For credit memos, update the custbody_ps_mjsmt_due_date field
                                const fieldToUpdate = isCredMemo ? 'custrecord_itl_ar_billing_detail_duedate' : 'duedate';

                                log.debug('Updating transaction', {
                                    id: transaction.internalId,
                                    type: transaction.documentType,
                                    field: fieldToUpdate,
                                    value: parsedDueDate,
                                });

                                // Use submitFields to update the record without loading the entire record
                                record.submitFields({
                                    type: isCredMemo ? 'creditmemo' : 'invoice',
                                    id: transaction.internalId,
                                    values: {
                                        [fieldToUpdate]: parsedDueDate,
                                    },
                                    options: {
                                        enableSourcing: true,
                                        ignoreMandatoryFields: true,
                                    },
                                });
                            } catch (updateError) {
                                log.error('Error updating transaction due date', {
                                    error: updateError,
                                    transaction: transaction.internalId,
                                    documentType: transaction.documentType,
                                });
                            }
                        });
                    }

                    return showSuccessPage(response, {
                        recordId: headerRecordIds.join(','),
                        recordType: 'customrecord_itl_ar_billing_gen',
                        billingNo: billingNumbers.join(', '),
                        detailCount: totalDetailCount,
                    });
                } catch (e) {
                    log.error({
                        title: 'Error creating AR Billing records',
                        details: e.toString(),
                    });
                    return showErrorPage(response, 'Error creating AR Billing records: ' + e.toString());
                }
            } catch (outerError) {
                log.error({
                    title: 'Error in AR Billing process',
                    details: outerError.toString(),
                });
                return showErrorPage(response, 'Error in AR Billing process: ' + outerError.toString());
            }
        };

        /**
         * Generates a billing number using the running number system
         * @returns {String} The generated billing number
         */
        const generateBillingNumber = () => {
            let digitLength = 0;

            const padNumber = (num, size) => {
                let s = num.toString();
                while (s.length < size) s = '0' + s;
                return s;
            };

            const numberingSearchObj = search.create({
                type: 'customrecord_itl_ar_billing_document_no',
                filters:
                    [
                        ["formulatext: CASE      WHEN {custrecord_itl_ar_billing_doc_no_datefro} <= CURRENT_DATE AND {custrecord_itl_ar_billing_doc_no_dateto} >= CURRENT_DATE      THEN 1      ELSE 0 END", "is", "1"]
                    ],
                columns: ['internalid', 'custrecord_itl_ar_billing_doc_no_prefix', 'custrecord_ar_billing_doc_no_current', 'custrecord_itl_ar_billing_doc_no_minimum'],
            });

            const searchResultCount = numberingSearchObj.runPaged().count;
            log.debug('Numbering search result count', searchResultCount);

            let lastNumber = 0;
            let numberingRecordId = null;
            let prefix = '';

            if (searchResultCount > 0) {
                const searchResult = numberingSearchObj.run().getRange({
                    start: 0,
                    end: 1,
                })[0];

                numberingRecordId = searchResult.getValue('internalid');
                lastNumber = parseInt(searchResult.getValue('custrecord_ar_billing_doc_no_current') || '0', 10);
                prefix = searchResult.getValue('custrecord_itl_ar_billing_doc_no_prefix');
                digitLength = parseInt(searchResult.getValue('custrecord_itl_ar_billing_doc_no_minimum'));

                lastNumber++;

                const numberingRecord = record.load({
                    type: 'customrecord_itl_ar_billing_document_no',
                    id: numberingRecordId,
                    isDynamic: true,
                });

                numberingRecord.setValue({
                    fieldId: 'custrecord_ar_billing_doc_no_current',
                    value: lastNumber,
                });

                numberingRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true,
                });
            } else {
                lastNumber = 1;

                const newNumberingRecord = record.create({
                    type: 'customrecord_itl_ar_billing_document_no',
                    isDynamic: true,
                });

                newNumberingRecord.setValue({
                    fieldId: 'name',
                    value: 'AR Billing Document Numbering',
                });

                newNumberingRecord.setValue({
                    fieldId: 'custrecord_itl_ar_billing_doc_no_prefix',
                    value: defaultPrefix,
                });

                newNumberingRecord.setValue({
                    fieldId: 'custrecord_ar_billing_doc_no_current',
                    value: lastNumber,
                });

                numberingRecordId = newNumberingRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true,
                });
            }

            const formattedNumber = padNumber(lastNumber, digitLength);

            const documentNumber = prefix + '-' + formattedNumber;

            log.debug('Generated billing number', documentNumber);
            return documentNumber;
        };

        /**
         * Performs search for transactions based on filters
         * @param {String} customer - Customer internal ID
         * @param {String} documentNumber - Document number
         * @param {String} transactionDateFrom - Transaction date from
         * @param {String} transactionDateTo - Transaction date to
         * @param {String} dueDateFrom - Due date from
         * @param {String} dueDateTo - Due date to
         * @param {String} terms - Terms internal ID
         * @param {Number} pageIndex - Page index for pagination
         * @returns {Object} Search results and pagination info
         */
        const performSearch = (customer, documentNumber, transactionDateFrom, transactionDateTo, dueDateFrom, dueDateTo, terms, pageIndex) => {
            const filters = [
                ['type', 'anyof', 'CustInvc', 'CustCred'],
                'AND',
                ['mainline', 'is', 'T'],
                'AND',
                ['taxline', 'is', 'F'],
                'AND',
                ['shipping', 'is', 'F'],
                'AND',
                ['amountremaining', 'greaterthan', '0.00'],
            ];

            if (customer) {
                let customers;
                if (customer.indexOf(',') !== -1) {
                    customers = customer.split(',');
                } else {
                    customers = customer.split('\u0005');
                }

                if (customers.length > 0 && customers[0] !== '' && customers[0] !== '0') {
                    filters.push('AND', ['customer.internalid', 'anyof', customers]);
                    log.debug('Customer Filter', { customers: customers });
                }
            }
            if (documentNumber) {
                let documentNumbers;
                if (documentNumber.indexOf(',') !== -1) {
                    documentNumbers = documentNumber.split(',');
                } else {
                    documentNumbers = documentNumber.split('\u0005');
                }

                if (documentNumbers.length > 0 && documentNumbers[0] !== '' && documentNumbers[0] !== '0') {
                    filters.push('AND', ['internalid', 'anyof', documentNumbers]);
                    log.debug('Document Number Filter', { documentNumbers: documentNumbers });
                }
            }
            if (transactionDateFrom && transactionDateTo) {
                filters.push('AND', ['trandate', 'within', transactionDateFrom, transactionDateTo]);
            } else if (transactionDateFrom) {
                filters.push('AND', ['trandate', 'onorafter', transactionDateFrom]);
            } else if (transactionDateTo) {
                filters.push('AND', ['trandate', 'onorbefore', transactionDateTo]);
            }

            if (dueDateFrom && dueDateTo) {
                filters.push('AND', ['duedate', 'within', dueDateFrom, dueDateTo]);
            } else if (dueDateFrom) {
                filters.push('AND', ['duedate', 'onorafter', dueDateFrom]);
            } else if (dueDateTo) {
                filters.push('AND', ['duedate', 'onorbefore', dueDateTo]);
            }

            if (terms) {
                filters.push('AND', ['terms', 'anyof', terms]);
            }

            const transactionSearch = search.create({
                type: 'transaction',
                filters: filters,
                columns: [
                    search.createColumn({
                        name: 'internalid',
                    }),
                    search.createColumn({
                        name: 'internalid',
                        join: 'customer',
                    }),
                    search.createColumn({
                        name: 'altname',
                        join: 'customer',
                    }),
                    search.createColumn({
                        name: 'terms',
                    }),
                    search.createColumn({
                        name: 'createdfrom',
                    }),
                    search.createColumn({
                        name: 'custbody_itl_term',
                    }),
                    search.createColumn({
                        name: 'tranid',
                    }),
                    search.createColumn({
                        name: 'type',
                    }),
                    search.createColumn({
                        name: 'trandate',
                    }),
                    search.createColumn({
                        name: 'duedate',
                    }),
                    search.createColumn({
                        name: 'custbody_itl_due_datecredit_memo',
                    }),
                    search.createColumn({
                        name: 'currency',
                    }),
                    search.createColumn({
                        name: 'amount',
                    }),
                    search.createColumn({
                        name: 'total',
                    }),
                    search.createColumn({
                        name: 'amountpaid',
                    }),
                    search.createColumn({
                        name: 'amountremaining',
                    }),
                    search.createColumn({
                        name: 'fxamountpaid',
                    }),
                    search.createColumn({
                        name: 'fxamountremaining',
                    }),
                    search.createColumn({
                        name: 'fxamount',
                    }),
                ],
            });

            const pagedData = transactionSearch.runPaged({
                pageSize: 100,
            });

            const pageCount = pagedData.pageRanges.length;

            if (pageCount === 0) {
                return {
                    results: [],
                    hasMore: false,
                };
            }

            const currentPageIndex = Math.min(pageIndex, pageCount - 1);
            const currentPage = pagedData.fetch({
                index: currentPageIndex,
            });

            const results = [];
            currentPage.data.forEach(function (result) {
                // Use foreign currency amounts instead of base currency
                let fxRemainingAmount = result.getValue({ name: 'fxamountremaining' }) || result.getValue({ name: 'amountremaining' });
                const documentType = result.getText({ name: 'type' });
                const isCredMemo = documentType === 'Credit Memo';

                // For credit memos, make the amount negative
                if (isCredMemo && fxRemainingAmount > 0) {
                    fxRemainingAmount = parseFloat(fxRemainingAmount) * -1;
                }

                // Use different fields for Credit Memo vs Invoice
                const termsId = isCredMemo ? result.getValue({ name: 'custbody_itl_term' }) || result.getValue({ name: 'terms' }) : result.getValue({ name: 'terms' });

                const termsName = isCredMemo ? result.getText({ name: 'custbody_itl_term' }) || result.getText({ name: 'terms' }) : result.getText({ name: 'terms' });

                const documentDueDate = isCredMemo ? result.getValue({ name: 'custbody_itl_due_datecredit_memo' }) || result.getValue({ name: 'duedate' }) : result.getValue({ name: 'duedate' });

                results.push({
                    internalId: result.getValue({ name: 'internalid' }),
                    customerId: result.getValue({ name: 'internalid', join: 'customer' }),
                    customerName: result.getValue({ name: 'altname', join: 'customer' }),
                    termsId: termsId,
                    termsName: termsName,
                    documentNo: result.getValue({ name: 'tranid' }),
                    documentType: documentType,
                    documentDate: result.getValue({ name: 'trandate' }),
                    documentDueDate: documentDueDate,
                    currencyId: result.getValue({ name: 'currency' }),
                    currency: result.getText({ name: 'currency' }),
                    originalAmount: result.getValue({ name: 'fxamount' }) || result.getValue({ name: 'amount' }),
                    total: result.getValue({ name: 'total' }),
                    amountPaid: result.getValue({ name: 'fxamountpaid' }) || result.getValue({ name: 'amountpaid' }),
                    remainingAmount: fxRemainingAmount,
                    billingAmount: fxRemainingAmount,
                    createdFrom: result.getValue({ name: 'createdfrom' }),
                    createdFromText: result.getText({ name: 'createdfrom' }),
                });
            });

            results.sort(function (a, b) {
                if (a.documentType !== b.documentType) {
                    if (a.documentType === 'Invoice') return -1;
                    if (b.documentType === 'Invoice') return 1;
                }

                return a.documentNo.localeCompare(b.documentNo);
            });

            return {
                results: results,
                hasMore: currentPageIndex < pageCount - 1,
            };
        };

        /**
         * Populates the sublist with search results
         * @param {Object} sublist - Sublist object
         * @param {Array} results - Search results
         * @param {Boolean} hasMore - Whether there are more pages
         */
        const populateSublist = (sublist, results, hasMore) => {
            for (let i = 0; i < results.length; i++) {
                const result = results[i];

                if (result.internalId) {
                    sublist.setSublistValue({
                        id: 'custpage_internal_id',
                        line: i,
                        value: result.internalId,
                    });
                }

                if (result.customerId) {
                    sublist.setSublistValue({
                        id: 'custpage_customer_id',
                        line: i,
                        value: result.customerId,
                    });
                }

                if (result.customerName) {
                    sublist.setSublistValue({
                        id: 'custpage_customer_name',
                        line: i,
                        value: result.customerName,
                    });
                }

                if (result.termsId) {
                    sublist.setSublistValue({
                        id: 'custpage_terms_id',
                        line: i,
                        value: result.termsId,
                    });
                }

                if (result.termsName) {
                    sublist.setSublistValue({
                        id: 'custpage_terms_name',
                        line: i,
                        value: result.termsName,
                    });
                }

                if (result.documentNo) {
                    sublist.setSublistValue({
                        id: 'custpage_document_no',
                        line: i,
                        value: result.documentNo,
                    });
                }

                if (result.documentType) {
                    sublist.setSublistValue({
                        id: 'custpage_document_type',
                        line: i,
                        value: result.documentType,
                    });
                }

                if (result.documentDate) {
                    sublist.setSublistValue({
                        id: 'custpage_document_date',
                        line: i,
                        value: result.documentDate,
                    });
                }

                if (result.documentDueDate) {
                    sublist.setSublistValue({
                        id: 'custpage_document_due_date',
                        line: i,
                        value: result.documentDueDate,
                    });
                }

                if (result.currencyId) {
                    sublist.setSublistValue({
                        id: 'custpage_currency_id',
                        line: i,
                        value: result.currencyId,
                    });
                }

                if (result.currency) {
                    sublist.setSublistValue({
                        id: 'custpage_currency',
                        line: i,
                        value: result.currency,
                    });
                }

                if (result.originalAmount) {
                    sublist.setSublistValue({
                        id: 'custpage_original_amount',
                        line: i,
                        value: result.originalAmount,
                    });
                } else {
                    sublist.setSublistValue({
                        id: 'custpage_original_amount',
                        line: i,
                        value: '0.00',
                    });
                }

                if (result.amountPaid) {
                    sublist.setSublistValue({
                        id: 'custpage_billed_amount',
                        line: i,
                        value: result.amountPaid,
                    });
                } else {
                    sublist.setSublistValue({
                        id: 'custpage_billed_amount',
                        line: i,
                        value: '0.00',
                    });
                }

                if (result.remainingAmount) {
                    sublist.setSublistValue({
                        id: 'custpage_remaining_amount',
                        line: i,
                        value: result.remainingAmount,
                    });
                } else {
                    sublist.setSublistValue({
                        id: 'custpage_remaining_amount',
                        line: i,
                        value: '0.00',
                    });
                }

                if (result.billingAmount) {
                    sublist.setSublistValue({
                        id: 'custpage_billing_amount',
                        line: i,
                        value: result.billingAmount,
                    });
                } else {
                    sublist.setSublistValue({
                        id: 'custpage_billing_amount',
                        line: i,
                        value: '0.00',
                    });
                }
                if (result.createdFrom) {
                    sublist.setSublistValue({
                        id: 'custpage_createdfrom',
                        line: i,
                        value: result.createdFrom,
                    });
                }
                if (result.createdFromText) {
                    sublist.setSublistValue({
                        id: 'custpage_createdfromtext',
                        line: i,
                        value: result.createdFromText,
                    });
                }
            }

            if (results.length === 0) {
                sublist.setSublistValue({
                    id: 'custpage_document_no',
                    line: 0,
                    value: 'No records found matching the criteria.',
                });
            }
        };

        /**
         * Shows an error page with the given message using NetSuite's standard message module
         * @param {Object} response - Response object
         * @param {String} errorMessage - Error message to display
         */
        const showErrorPage = (response, errorMessage) => {
            const form = serverWidget.createForm({
                title: 'AR Billing',
            });

            form.addPageInitMessage({
                type: message.Type.ERROR,
                title: 'AR Billing Error',
                message: errorMessage,
            });

            const instructionsField = form.addField({
                id: 'custpage_instructions',
                type: serverWidget.FieldType.INLINEHTML,
                label: ' ',
            });

            instructionsField.defaultValue = '<div style="margin: 20px 0;">Please click the button below to return to AR Billing.</div>';

            form.addButton({
                id: 'custpage_back_button',
                label: 'Back to AR Billing',
                functionName: 'backToMain',
            });

            form.clientScriptModulePath = 'SuiteScripts/Pointstar Customizations/AR Invoice Group/SS2.1/PS_CS_ARBilling.js';

            response.writePage(form);
        };

        /**
         * Shows a success page with record links using NetSuite's standard message module
         * @param {Object} response - Response object
         * @param {Object} data - Data object containing record information
         */
        const showSuccessPage = (response, data) => {
            const form = serverWidget.createForm({
                title: 'AR Billing',
            });

            form.addPageInitMessage({
                type: message.Type.CONFIRMATION,
                title: 'AR Billing Success',
                message: `${data.detailCount} transactions have been successfully processed.`,
            });

            const linkField = form.addField({
                id: 'custpage_record_link',
                type: serverWidget.FieldType.INLINEHTML,
                label: ' ',
            });

            // Split the record IDs and billing numbers
            const recordIds = data.recordId.split(',');
            const billingNumbers = data.billingNo.split(', ');

            // Create a table to display all billing records
            let htmlContent = `
        <div style="margin: 20px 0;">
            <h3>Generated AR Billing Records</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Billing Number</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Action</th>
                    </tr>
                </thead>
                <tbody>
        `;

            // Add a row for each billing record
            for (let i = 0; i < recordIds.length; i++) {
                const recordUrl = url.resolveRecord({
                    recordType: data.recordType,
                    recordId: recordIds[i],
                    isEditMode: false,
                });

                htmlContent += `
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${billingNumbers[i]}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">
                        <a href="${recordUrl}" target="_blank" class="uir-button uir-button-primary" style="text-decoration: none; padding: 5px 10px; background-color: #0067b8; color: white; border-radius: 3px;">View Record</a>
                    </td>
                </tr>
            `;
            }

            htmlContent += `
                </tbody>
            </table>
        </div>
        `;

            linkField.defaultValue = htmlContent;

            form.addButton({
                id: 'custpage_new_button',
                label: 'Create New AR Billing',
                functionName: 'backToMain',
            });

            form.clientScriptModulePath = 'SuiteScripts/Pointstar Customizations/AR Invoice Group/SS2.1/PS_CS_ARBilling.js';

            response.writePage(form);
        };

        return { onRequest };
    });
