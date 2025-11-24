/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/format', 'N/redirect', 'N/task'], (serverWidget, search, record, format, redirect, task) => {
    const onRequest = (context) => {
        if (context.request.method === 'GET') {
            let form = serverWidget.createForm({ title: 'Group Billing' });

            form.clientScriptModulePath = 'SuiteScripts/PS Customization/Billing Sheet/ps_cs_group_billing_helper.js';

            form.addFieldGroup({
                id: 'custpage_filters',
                label: 'Filters',
            });

            let customerField = form.addField({
                id: 'custpage_custfilter',
                type: serverWidget.FieldType.SELECT,
                label: 'Customer',
                source: 'customer', // New Req
                container: 'custpage_filters',
            });
            customerField.isMandatory = true;
            customerField.updateBreakType({
                breakType: serverWidget.FieldBreakType.STARTCOL,
            });
            customerField.updateLayoutType({
                layoutType: serverWidget.FieldLayoutType.STARTROW,
            });
            /*
            customerField.setHelpText({
                help: 'Select a customer to load related transactions.',
            });

            customerField.addSelectOption({
                value: '',
                text: '',
            });

            let customerSearch = search.create({
                type: search.Type.CUSTOMER,
                filters: [['isinactive', 'is', 'F']],
                columns: ['internalid', 'entityid', 'altname'],
            });

            customerSearch.run().each(function (result) {
                const entityId = result.getValue('entityid') || '';
                const altName = result.getValue('altname') || '';
                const displayCustText = `${entityId} - ${altName}`;

                customerField.addSelectOption({
                    value: result.getValue('internalid'),
                    text: displayCustText, //result.getValue('altname') || result.getValue('entityid')
                });
                return true;
            });
            */
            customerField.defaultValue = '';

            let currField = form.addField({
                id: 'custpage_currfilter',
                type: serverWidget.FieldType.SELECT,
                label: 'Currency',
                source: 'currency', // New Req
                container: 'custpage_filters',
            });
            /*
            currField.setHelpText({
                help: 'Select a currency to load related transactions.',
            });

            currField.addSelectOption({ value: '', text: '' });

            search
                .create({
                    type: search.Type.CURRENCY,
                    columns: ['name'],
                })
                .run()
                .each(function (result) {
                    currField.addSelectOption({
                        value: result.id,
                        text: result.getValue('name'),
                    });
                    return true;
                });
                */
            currField.defaultValue = '';

            let termField = form.addField({
                id: 'custpage_termfilter',
                type: serverWidget.FieldType.SELECT,
                label: 'Terms',
                source: 'term', // New Req
                container: 'custpage_filters',
            });
            /*
            termField.setHelpText({
                help: 'Select a term to load related transactions.',
            });

            termField.addSelectOption({ value: '', text: '' });

            search
                .create({
                    type: search.Type.TERM,
                    columns: ['name'],
                })
                .run()
                .each(function (result) {
                    termField.addSelectOption({
                        value: result.id,
                        text: result.getValue('name'),
                    });
                    return true;
                });
                */
            termField.defaultValue = '';

            let accField = form.addField({
                id: 'custpage_accfilter',
                type: serverWidget.FieldType.SELECT,
                label: 'Account',
                source: 'account', // New Req
                container: 'custpage_filters',
            });
            /*
            accField.setHelpText({
                help: 'Select a account to load related transactions.',
            });
            
            accField.addSelectOption({ value: '', text: '' });

            search
                .create({
                    type: search.Type.ACCOUNT,
                    columns: ['number', 'name'],
                })
                .run()
                .each(function (result) {
                    let number = result.getValue('number');
                    let name = result.getValue('name');
                    let label = `${number} - ${name}`;

                    accField.addSelectOption({
                        value: result.id,
                        text: label,
                    });
                    return true;
                });
                */
            accField.defaultValue = '';

            form.addFieldGroup({
                id: 'custpage_Period',
                label: 'Period',
            });

            let fromDateField = form.addField({
                id: 'custpage_fromdate',
                type: serverWidget.FieldType.DATE,
                label: 'From Date',
                container: 'custpage_Period',
            });

            let toDateField = form.addField({
                id: 'custpage_todate',
                type: serverWidget.FieldType.DATE,
                label: 'To Date',
                container: 'custpage_Period',
            });

            let sublist = form.addSublist({
                id: 'custpage_transaction_list',
                type: serverWidget.SublistType.LIST,
                label: 'Select Transactions',
            });

            sublist.addMarkAllButtons();

            sublist.addField({
                id: 'custpage_select',
                type: serverWidget.FieldType.CHECKBOX,
                label: 'Group',
            });

            sublist
                .addField({
                    id: 'custpage_internalid',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Internal ID',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN,
                });

            sublist
                .addField({
                    id: 'custpage_tranid',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Transaction ID',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

            sublist
                .addField({
                    id: 'custpage_trandate',
                    type: serverWidget.FieldType.DATE,
                    label: 'Transaction Date',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

            sublist
                .addField({
                    id: 'custpage_customer',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Customer',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

            sublist
                .addField({
                    id: 'custpage_currencycode',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Currency Code',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN,
                });

            sublist
                .addField({
                    id: 'custpage_currency',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Currency',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

            sublist
                .addField({
                    id: 'custpage_termid',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Term ID',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN,
                });

            sublist
                .addField({
                    id: 'custpage_terms',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Terms',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

            sublist
                .addField({
                    id: 'custpage_accountcode',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Account Code',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN,
                });

            sublist
                .addField({
                    id: 'custpage_account',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Account',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

            sublist
                .addField({
                    id: 'custpage_amount',
                    type: serverWidget.FieldType.CURRENCY,
                    label: 'Amount',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

            sublist
                .addField({
                    id: 'custpage_groupindicator',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Group Indicator',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN,
                });

            sublist
                .addField({
                    id: 'custpage_status',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Status',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

            sublist
                .addField({
                    id: 'custpage_trantype',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Transaction Type',
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

            let customerId = context.request.parameters.custpage_custfilter || '';
            customerField.defaultValue = customerId;

            if (customerId) {
                let currId = context.request.parameters.custpage_currfilter;
                let termId = context.request.parameters.custpage_termfilter;
                let accId = context.request.parameters.custpage_accfilter;
                let fromDate = context.request.parameters.custpage_fromdate;
                let toDate = context.request.parameters.custpage_todate;

                if (currId) {
                    currField.defaultValue = currId;
                }
                if (termId) {
                    termField.defaultValue = termId;
                }
                if (accId) {
                    accField.defaultValue = accId;
                }
                if (fromDate) {
                    fromDateField.defaultValue = fromDate;
                }
                if (toDate) {
                    toDateField.defaultValue = toDate;
                }

                let filters = [
                    ['entity', 'anyof', customerId],
                    'AND',
                    ['type', 'anyof', ['CustInvc', 'CustCred']],
                    'AND',
                    ['status', 'anyof', ['CustInvc:A', 'CustCred:A']],
                    'AND',
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['custbody_ps_billing_sheet_id', 'anyof', '@NONE@'],
                ];

                if (currId) {
                    filters.push('AND');
                    filters.push(['currency', 'anyof', currId]);
                }

                if (termId) {
                    filters.push('AND');
                    filters.push(['terms', 'anyof', termId]);
                }

                if (accId) {
                    filters.push('AND');
                    filters.push(['account', 'anyof', accId]);
                }

                if (fromDate && toDate) {
                    filters.push('AND');
                    filters.push(['trandate', 'within', fromDate, toDate]);
                } else if (fromDate) {
                    filters.push('AND');
                    filters.push(['trandate', 'onorafter', fromDate]);
                } else if (toDate) {
                    filters.push('AND');
                    filters.push(['trandate', 'onorbefore', toDate]);
                }

                let transactionSearch = search.create({
                    type: search.Type.TRANSACTION,
                    filters: filters,
                    columns: [
                        search.createColumn({ name: 'entity', sort: search.Sort.ASC }), // customer
                        search.createColumn({ name: 'currency', sort: search.Sort.ASC }),
                        search.createColumn({ name: 'terms', sort: search.Sort.ASC }),
                        search.createColumn({ name: 'account', sort: search.Sort.ASC }),
                        'internalid',
                        'tranid',
                        'trandate',
                        'amount',
                        'status',
                        'type',
                    ],
                });

                let searchResult = transactionSearch.run().getRange({ start: 0, end: 1000 });

                /*
                let indic = 1;
                let indicCust = '';
                let indicCurr = '';
                let indicTerms = '';
                let indicAcc = '';
                */

                searchResult.forEach((result, index) => {
                    sublist.setSublistValue({
                        id: 'custpage_internalid',
                        line: index,
                        value: result.getValue('internalid'),
                    });

                    //log.debug('Billing Sheet ID', result.getValue('tranid') + ' : ' + result.getValue('custbody_ps_billing_sheet_id'));

                    sublist.setSublistValue({
                        id: 'custpage_tranid',
                        line: index,
                        value: result.getValue('tranid'),
                    });

                    sublist.setSublistValue({
                        id: 'custpage_trandate',
                        line: index,
                        value: result.getValue('trandate'),
                    });

                    sublist.setSublistValue({
                        id: 'custpage_customer',
                        line: index,
                        value: result.getText('entity'),
                    });

                    sublist.setSublistValue({
                        id: 'custpage_currencycode',
                        line: index,
                        value: result.getValue('currency'),
                    });

                    sublist.setSublistValue({
                        id: 'custpage_currency',
                        line: index,
                        value: result.getText('currency'),
                    });

                    if (result.getValue('terms') != '') {
                        sublist.setSublistValue({
                            id: 'custpage_termid',
                            line: index,
                            value: result.getValue('terms'),
                        });
                    }

                    if (result.getText('terms') != '') {
                        sublist.setSublistValue({
                            id: 'custpage_terms',
                            line: index,
                            value: result.getText('terms'),
                        });
                    }

                    sublist.setSublistValue({
                        id: 'custpage_accountcode',
                        line: index,
                        value: result.getValue('account'),
                    });

                    sublist.setSublistValue({
                        id: 'custpage_account',
                        line: index,
                        value: result.getText('account'),
                    });

                    sublist.setSublistValue({
                        id: 'custpage_amount',
                        line: index,
                        value: result.getValue('amount'),
                    });

                    /*
                    if (indicCust != '') {
                        if (indicCust != result.getText('entity') || indicCurr != result.getText('currency') || indicTerms != result.getText('terms') || indicAcc != result.getText('account')) {
                            indic += 1;
                        }
                    }
                    indicCust = result.getText('entity');
                    indicCurr = result.getText('currency');
                    indicTerms = result.getText('terms');
                    indicAcc = result.getText('account');

                    sublist.setSublistValue({
                        id: 'custpage_groupindicator',
                        line: index,
                        value: indic,
                    });
                    */

                    sublist.setSublistValue({
                        id: 'custpage_status',
                        line: index,
                        value: result.getText('status'),
                    });

                    sublist.setSublistValue({
                        id: 'custpage_trantype',
                        line: index,
                        value: result.getText('type'),
                    });
                });
            }

            form.addSubmitButton({ label: 'Submit' });

            context.response.writePage(form);
        } else if (context.request.method === 'POST') {
            let customerId = context.request.parameters.custpage_custfilter;
            let fromDate = context.request.parameters.custpage_fromdate;
            let toDate = context.request.parameters.custpage_todate;

            let selectedTransactions = [];

            const lineCount = context.request.getLineCount({
                group: 'custpage_transaction_list',
            });

            for (let i = 0; i < lineCount; i++) {
                let isSelected = context.request.getSublistValue({
                    group: 'custpage_transaction_list',
                    name: 'custpage_select',
                    line: i,
                });

                if (isSelected === 'T' || isSelected === true) {
                    let internalid = context.request.getSublistValue({
                        group: 'custpage_transaction_list',
                        name: 'custpage_internalid',
                        line: i,
                    });

                    let tranId = context.request.getSublistValue({
                        group: 'custpage_transaction_list',
                        name: 'custpage_tranid',
                        line: i,
                    });

                    let currency = context.request.getSublistValue({
                        group: 'custpage_transaction_list',
                        name: 'custpage_currencycode',
                        line: i,
                    });

                    let terms = context.request.getSublistValue({
                        group: 'custpage_transaction_list',
                        name: 'custpage_termid',
                        line: i,
                    });

                    let account = context.request.getSublistValue({
                        group: 'custpage_transaction_list',
                        name: 'custpage_accountcode',
                        line: i,
                    });

                    let dueDate = context.request.getSublistValue({
                        group: 'custpage_transaction_list',
                        name: 'custpage_trandate',
                        line: i,
                    });

                    let tranDate = context.request.getSublistValue({
                        group: 'custpage_transaction_list',
                        name: 'custpage_trandate',
                        line: i,
                    });

                    let amount = context.request.getSublistValue({
                        group: 'custpage_transaction_list',
                        name: 'custpage_amount',
                        line: i,
                    });

                    let status = context.request.getSublistValue({
                        group: 'custpage_transaction_list',
                        name: 'custpage_status',
                        line: i,
                    });

                    let type = context.request.getSublistValue({
                        group: 'custpage_transaction_list',
                        name: 'custpage_trantype',
                        line: i,
                    });

                    selectedTransactions.push({
                        internalid,
                        tranId,
                        currency,
                        terms,
                        account,
                        dueDate,
                        trandate: tranDate,
                        amount,
                        status,
                        type,
                    });
                }
            }

            if (selectedTransactions.length === 0) {
                context.response.write(`<script>alert('No transactions selected!');window.history.back();</script>`);
                return;
            }

            let last = selectedTransactions[selectedTransactions.length - 1];
            let first = selectedTransactions[0];

            let billingSheet = record.create({
                type: 'customrecord_ps_billing_sheet',
            });

            billingSheet.setValue({
                fieldId: 'custrecord_bs_customer',
                value: customerId,
            });

            log.debug('first.internalid', first.internalid);

            if (first.currency)
                billingSheet.setValue({
                    fieldId: 'custrecord_bs_currency',
                    value: first.currency,
                });

            if (first.terms)
                billingSheet.setValue({
                    fieldId: 'custrecord_bs_terms',
                    value: first.terms,
                });

            if (first.account)
                billingSheet.setValue({
                    fieldId: 'custrecord_bs_account',
                    value: first.account,
                });

            let billType;
            if (first.type === 'Invoice') {
                billType = record.Type.INVOICE;
            } else {
                billType = record.Type.CREDIT_MEMO;
            }
            let billAdd = record
                .load({
                    type: billType,
                    id: first.internalid,
                })
                .getValue({ fieldId: 'billaddress' });

            if (billAdd)
                billingSheet.setValue({
                    fieldId: 'custrecord_bs_billaddress',
                    value: billAdd,
                });

            const today = new Date();
            let formattedDate = format.parse({
                value: today,
                type: format.Type.DATE,
            });

            billingSheet.setValue({
                fieldId: 'custrecord_bs_created_date',
                value: formattedDate,
            });

            /*
            if (first.trandate) {
                let formattedDate = format.parse({
                    value: first.trandate,
                    type: format.Type.DATE,
                });

                billingSheet.setValue({
                    fieldId: 'custrecord_bs_date',
                    value: formattedDate,
                });
            }
            */

            var newReceiptNumber = generateNextReceiptNumber();

            billingSheet.setValue({
                fieldId: 'custrecord_bs_receipt',
                value: newReceiptNumber,
            });

            const sublistId = 'recmachcustrecord_bs_id';
            selectedTransactions.forEach((txn, i) => {
                /*
                billingSheet.selectNewLine({
                    sublistId,
                });*/
                billingSheet.insertLine({
                    sublistId: sublistId,
                    line: i,
                });

                if (txn.tranId) {
                    billingSheet.setSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_bsd_tranid',
                        line: i,
                        value: txn.internalid,
                    });
                }

                if (txn.trandate) {
                    let formattedTranDate = format.parse({
                        value: txn.trandate,
                        type: format.Type.DATE,
                    });
                    billingSheet.setSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_bsd_trandate',
                        line: i,
                        value: formattedTranDate,
                    });
                }

                if (txn.amount) {
                    billingSheet.setSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_bsd_amount',
                        line: i,
                        value: parseFloat(txn.amount),
                    });
                }

                log.debug('txn.type', txn.type);

                if (txn.type) {
                    billingSheet.setSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_bsd_trantype',
                        line: i,
                        value: txn.type,
                    });
                }

                if (txn.status) {
                    billingSheet.setSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_bsd_status',
                        line: i,
                        value: txn.status,
                    });
                }

                if (txn.currency)
                    billingSheet.setSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_bsd_currency',
                        line: i,
                        value: txn.currency,
                    });

                if (txn.terms)
                    billingSheet.setSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_bsd_terms',
                        line: i,
                        value: txn.terms,
                    });

                if (txn.account)
                    billingSheet.setSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_bsd_account',
                        line: i,
                        value: txn.account,
                    });

                /*
                billingSheet.commitLine({
                    sublistId,
                });
                */
            });

            if (last.trandate) {
                let formattedDate = format.parse({
                    value: last.trandate,
                    type: format.Type.DATE,
                });

                billingSheet.setValue({
                    fieldId: 'custrecord_bs_date',
                    value: formattedDate,
                });
            }

            let billingSheetId = billingSheet.save();

            //selectedTransactions.forEach((txn) => {
            /*
                let lineRecord = record.create({
                    type: 'customrecord_ps_billing_sheet_detail',
                });

                lineRecord.setValue({
                    fieldId: 'custrecord_bs_id',
                    value: billingSheetId,
                });

                if (txn.tranId) {
                    lineRecord.setValue({
                        fieldId: 'custrecord_bsd_tranid',
                        value: txn.internalid,
                    });
                }

                if (txn.trandate) {
                    let formattedTranDate = format.parse({
                        value: txn.trandate,
                        type: format.Type.DATE,
                    });

                    lineRecord.setValue({
                        fieldId: 'custrecord_bsd_trandate',
                        value: formattedTranDate,
                    });
                }

                if (txn.amount) {
                    lineRecord.setValue({
                        fieldId: 'custrecord_bsd_amount',
                        value: parseFloat(txn.amount),
                    });
                }

                log.debug('txn.type', txn.type);

                if (txn.type) {
                    lineRecord.setValue({
                        fieldId: 'custrecord_bsd_trantype',
                        value: txn.type,
                    });
                }

                if (txn.status) {
                    lineRecord.setValue({
                        fieldId: 'custrecord_bsd_status',
                        value: txn.status,
                    });
                }

                if (txn.currency)
                    lineRecord.setValue({
                        fieldId: 'custrecord_bsd_currency',
                        value: txn.currency,
                    });

                if (txn.terms)
                    lineRecord.setValue({
                        fieldId: 'custrecord_bsd_terms',
                        value: txn.terms,
                    });

                if (txn.account)
                    lineRecord.setValue({
                        fieldId: 'custrecord_bsd_account',
                        value: txn.account,
                    });

                lineRecord.save();
                */

            /*try {
                    let recType;
                    if (txn.type === 'Invoice') {
                        recType = record.Type.INVOICE;
                    } else if (txn.type === 'Credit Memo') {
                        recType = record.Type.CREDIT_MEMO;
                    } else {
                        log.error('Unknown transaction type', txn.type);
                        return;
                    }

                    /*
                    let txnRec = record.load({
                        type: recType,
                        id: txn.internalid,
                    });

                    txnRec.setValue({
                        fieldId: 'custbody_ps_billing_sheet_id',
                        value: billingSheetId,
                    });

                    txnRec.save();
                    */

            /*record.submitFields({
                        type: recType,
                        id: txn.internalid,
                        values: {
                            custbody_ps_billing_sheet_id: billingSheetId,
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true,
                        },
                    });
                } catch (e) {
                    log.error('Failed to update transaction record', {
                        tranId: txn.tranId,
                        error: e,
                    });
                }
            });*/

            const processtask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: 'customscript_ps_ss_billing_update_helper',
                params: { custscript_ps_billing_sheet_id: billingSheetId },
            });

            log.debug('billingSheetId', billingSheetId);

            var taskId = processtask.submit();
            log.debug('taskId', taskId);

            /*redirect.redirect({
                url: '/app/common/custom/custrecordentrylist.nl?rectype=169',
            });*/
            redirect.toRecord({
                id: billingSheetId,
                type: 'customrecord_ps_billing_sheet',
                isEditMode: false,
                //parameters: Object
            });
        }
    };

    function generateNextReceiptNumber() {
        var maxNumber = 0;

        var receiptSearch = search.create({
            type: 'customrecord_ps_billing_sheet',
            filters: [['custrecord_bs_receipt', 'isnotempty', '']],
            columns: [
                search.createColumn({
                    name: 'custrecord_bs_receipt',
                    sort: search.Sort.DESC,
                }),
            ],
        });

        var results = receiptSearch.run().getRange({ start: 0, end: 1 });
        if (results.length > 0) {
            var lastReceipt = results[0].getValue('custrecord_bs_receipt'); // e.g., "BS00012"
            var match = lastReceipt.match(/(\d+)$/); // Extract numeric part
            if (match) {
                maxNumber = parseInt(match[1], 10);
            }
        }

        var nextNumber = maxNumber + 1;
        var paddedNumber = String(nextNumber).padStart(5, '0'); // BS00001
        return 'BS' + paddedNumber;
    }

    return { onRequest };
});
