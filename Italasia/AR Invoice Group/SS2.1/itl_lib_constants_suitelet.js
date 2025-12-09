define([], ()=>{

    const
        UI = {
            scriptId: 'customscript_itl_sl_ar_billing_notes',
            deploymentId: 'customdeploy_itl_sl_ar_billing_notes',
            title: "AR Invoice Group",
            clientScriptModulePath: 'SuiteScripts/Pointstar Customizations/AR Invoice Group/SS2.1/ps_cs_sales_ar_billing_note.js',
            buttons:{
                applyFilter: {
                    id: 'custpage_apply_filters',
                    label: 'Apply Filters',
                    functionName: 'applyFilter()'
                },
            },
            fields:{
                customer: {
                    id: 'custpage_customer_filter',
                    type: 'MULTISELECT',
                    label: 'Customer',
                    source: 'customer',
                    container: 'custpage_filters',
                    defaultValue: ''
                },
                currency: {
                    id: 'custpage_currency_filter',
                    type: 'SELECT',
                    label: 'Currency',
                    source: 'currency',
                    container: 'custpage_filters',
                    defaultValue: ''
                },
                term: {
                    id: 'custpage_term_filter',
                    type: 'SELECT',
                    label: 'Terms',
                    container: 'custpage_filters',
                    defaultValue: ''
                },
                createdBy: {
                    id: 'custpage_created_by',
                    type: 'SELECT',
                    label: 'Created By',
                    source: 'employee',
                    container: 'custpage_filters',
                    defaultValue: ''
                },
                account: {
                    id: 'custpage_account_filter',
                    type: 'SELECT',
                    label: 'Account',
                    source: 'account',
                    container: 'custpage_filters',
                    defaultValue: ''
                },
                fromDate: {
                    id: 'custpage_fromdate',
                    type: 'DATE',
                    label: 'From Date',
                    container: 'custpage_Period',
                },
                toDate: {
                    id: 'custpage_todate',
                    type: 'DATE',
                    label: 'To Date',
                    container: 'custpage_Period',
                },
                billingDate: {
                    id: 'custpage_billing_date',
                    type: 'DATE',
                    label: 'Billing Date',
                    container: 'custpage_billing_info_entry',
                    defaultValue: new Date(),
                    isMandatory: true
                },
                billingDueDate: {
                    id: 'custpage_billing_due_date',
                    type: 'DATE',
                    label: 'Billing Due Date',
                    container: 'custpage_billing_info_entry'
                },
                totalAmount: {
                    id: 'custpage_total_amount',
                    type: 'CURRENCY',
                    label: 'Total Amount',
                    container: 'custpage_billing_info_entry',
                    displayType: 'INLINE'

                }
            },
            fieldGroups: {
                filters: {
                    id: 'custpage_filters',
                    label: 'Filters'
                },
                period: {
                    id: 'custpage_Period',
                    label: 'Period'
                },
                billingInformationEntry: {
                    id: 'custpage_billing_info_entry',
                    label: 'Billing Information Entry'
                }
            },
            sublists:{
                transactions: {
                    id: 'custpage_transaction_sublist',
                    type: 'LIST',
                    label: 'Select Transactions',
                    fields:{
                        checkBox: {
                            id: 'custpage_checkbox',
                            type: 'CHECKBOX',
                            label: ' ',
                        },
                        tranType: {
                            id: 'custpage_trantype',
                            type: 'TEXT',
                            label: 'Transaction Type',
                            displayType: 'INLINE',
                            dataReference: 'type',
                            fetchText: true
                        },
                        documentNumber: {
                            id: 'custpage_tranid',
                            type: 'TEXT',
                            label: 'Document Number',
                            displayType: 'INLINE',
                            dataReference: 'tranId',
                            fetchValue: true
                        },
                        customer: {
                            id: 'custpage_customer',
                            type: 'TEXT',
                            label: 'Customer',
                            displayType: 'INLINE',
                            dataReference: 'entityId',
                            fetchText: true
                        },
                        customerCode: {
                            id: 'custpage_customer_code',
                            type: 'TEXT',
                            label: 'Customer',
                            displayType: 'HIDDEN',
                            dataReference: 'entityId',
                            fetchValue: true
                        },
                        account: {
                            id: 'custpage_account',
                            type: 'TEXT',
                            label: 'Account',
                            displayType: 'INLINE',
                            dataReference: 'accountId',
                            fetchText: true
                        },
                        date: {
                            id: 'custpage_trandate',
                            type: 'DATE',
                            label: 'Date',
                            displayType: 'INLINE',
                            dataReference: 'trandate',
                            fetchValue: true
                        },
                        dueDate: {
                            id: 'custpage_duedate',
                            type: 'DATE',
                            label: 'Due Date',
                            displayType: 'INLINE',
                            dataReference: 'dueDate',
                            fetchValue: true
                        },
                        terms: {
                            id: 'custpage_terms',
                            type: 'TEXT',
                            label: 'Terms',
                            displayType: 'INLINE',
                            dataReference: 'terms',
                            fetchText: true
                        },
                        termId: {
                            id: 'custpage_termid',
                            type: 'TEXT',
                            label: 'Term ID',
                            displayType: 'HIDDEN',
                            dataReference: 'terms',
                            fetchValue: true
                        },
                        internalId: {
                            id: 'custpage_internalid',
                            type: 'TEXT',
                            label: 'Internal ID',
                            displayType: 'HIDDEN',
                            dataReference: 'internalid',
                            fetchValue: true
                        },
                        recordType: {
                            id: 'custpage_recordtype',
                            type: 'TEXT',
                            label: 'Record Type',
                            displayType: 'HIDDEN',
                            dataReference: 'recordType',
                            fetchText: true
                        },
                        currencyCode: {
                            id: 'custpage_currencycode',
                            type: 'TEXT',
                            label: 'Currency Code',
                            displayType: 'HIDDEN',
                            dataReference: 'currency',
                            fetchValue: true
                        },
                        currency: {
                            id: 'custpage_currency',
                            type: 'TEXT',
                            label: 'Currency',
                            displayType: 'INLINE',
                            dataReference: 'currency',
                            fetchText: true
                        },
                        accountCode: {
                            id: 'custpage_accountcode',
                            type: 'TEXT',
                            label: 'Account Code',
                            displayType: 'HIDDEN',
                            dataReference: 'accountId',
                            fetchValue: true
                        },
                        status: {
                            id: 'custpage_status',
                            type: 'TEXT',
                            label: 'Status',
                            displayType: 'INLINE',
                            dataReference: 'status',
                            fetchValue: true
                        },
                        createdBy: {
                            id: 'custpage_createdby',
                            type: 'TEXT',
                            label: 'Created By',
                            displayType: 'INLINE',
                            dataReference: 'createdBy',
                            fetchText: true
                        },
                        createdById: {
                            id: 'custpage_createdby_id',
                            type: 'TEXT',
                            label: 'Created By ID',
                            displayType: 'HIDDEN',
                            dataReference: 'createdBy',
                            fetchValue: true
                        },
                        arBillingNoteTotal: {
                            id: 'custpage_ar_billing_note_total',
                            type: 'CURRENCY',
                            label: 'AR Billing Total',
                            displayType: 'INLINE',
                            dataReference: 'arBillingNoteTotal',
                            fetchValue: true
                        },
                        originalAmount: {
                            id: 'custpage_original_amount',
                            type: 'CURRENCY',
                            label: 'Original Amount',
                            displayType: 'INLINE',
                            dataReference: 'grossAmount',
                            fetchValue: true
                        },
                        billedAmount: {
                            id: 'custpage_billed_amount',
                            type: 'CURRENCY',
                            label: 'Billed Amount',
                            displayType: 'INLINE',
                            dataReference: 'amountPaid',
                            fetchValue: true
                        },
                        remainingAmount: {
                            id: 'custpage_remaining_amount',
                            type: 'CURRENCY',
                            label: 'Remaining Amount',
                            displayType: 'INLINE',
                            dataReference: 'amountRemaining',
                            fetchValue: true
                        },
                        billingAmount: {
                            id: 'custpage_billing_amount',
                            type: 'CURRENCY',
                            label: 'Billing Amount',
                            displayType: 'ENTRY',
                            dataReference: 'billingAmount',
                            fetchValue: true
                        },
                        arBillingNoteReference: {
                            id: 'custpage_ar_billing_note_reference',
                            type: 'TEXT',
                            label: 'AR Billing Note Reference',
                            displayType: 'HIDDEN',
                            dataReference: 'arBillingNoteReference',
                            fetchValue: true
                        },
                        groupIndicator: {
                            id: 'custpage_groupindicator',
                            type: 'TEXT',
                            label: 'Group Indicator',
                            displayType: 'HIDDEN',
                            fetchValue: true
                        }
                    },
                    buttons:{
                        markAllButtons: true
                    }
                }
            }
        },
        AR_BILLING_NOTE_RECORD = {
            recordType: 'customrecord_itl_ar_billing_gen',
            suiteletScript: {
                scriptId: 'customscript_itl_sl_ar_billing_notes',
                deploymentId: 'customdeploy_itl_sl_ar_billing_notes'
            },
            fields: {
                customer: {
                    id: 'custrecord_itl_ar_billing_customer',
                    dataReference: 'custpage_customer_code'
                },
                currency: {
                    id: 'custrecord_itl_ar_billing_currency',
                    dataReference: 'custpage_currencycode'
                },
                terms: {
                    id: 'custrecord_itl_ar_billing_detail_terms',
                    dataReference: 'custpage_termid'
                },
                date: {
                    id: 'custrecord_itl_ar_billing_date',
                    dataReference: 'custpage_billing_date'
                },
                dueDate: {
                    id: 'custrecord_itl_ar_billing_due_date',
                    dataReference: 'custpage_billing_due_date'
                },
                customerPaymentReference: {
                    id: 'custrecord_itl_ar_billing_gen_billpayref'
                }
            },
            sublists:{
                PROCESSED_TRANSACTIONS: {
                    id: 'recmachcustrecord_itl_ar_billing_detail_parent',
                    fields: {
                        type: { id: 'custrecord_itl_ar_billing_detail_doc_typ' },
                        documentNumber: { id: 'custrecord_itl_ar_billing_detail_doc_no' },
                        customer: { id:'custrecord_itl_ar_billing_detail_custome' },
                        account: { id:'custrecord_itl_ar_billing_detail_account' },
                        dueDate: { id:'custrecord_itl_ar_billing_detail_duedate' },
                        date: { id:'custrecord_itl_ar_billing_detail_date' },
                        terms: { id:'custrecord_itl_ar_billing_detail_terms' },
                        currency: { id:'custrecord_itl_ar_billing_detail_curren' },
                        createdBy: { id:'custrecord_itl_ar_billing_detail_create' },
                        originalAmount: { id:'custrecord_itl_ar_billing_detail_amount' },
                        billedAmount: { id:'custrecord_itl_ar_billing_detail_billed' },
                        remainingAmount: { id:'custrecord_itl_ar_billing_detail_remain' },
                        billingAmount: { id:'custrecord_itl_ar_billing_detail_billing' },
                        status: {id: 'custrecord_itl_ar_billing_detail_status'}
                    }
                }
            },
            customButtons:{
                acceptPayment: {
                    id: 'custpage_accept_payment',
                    label: 'Accept Payment'
                }
            },
            defaults: {
                status: {
                    INVOICE_PAID_IN_FULL: 'Invoice:Paid In Full'
                }
            }
        },
        AR_BILLNOTE_PROCESSED_TRANSACTIONS = {
            recordType: 'customrecord_itl_ar_billing_detail',
            fields: {
                documentNumber: { id: 'custrecord_itl_ar_billing_detail_doc_no' }
            },
            defaults: {
                status: {
                    INVOICE_PAID_IN_FULL: 'Invoice:Paid In Full'
                }
            }
        },
        TRANSACTION_SEARCH = {
            columns: {
                entity:{
                    name: 'entity'
                },
                type:{
                    name: 'type'
                },
                status:{
                    name: 'status'
                },
                mainline:{
                    name: 'mainline'
                },
                billingSheetId:{
                    name: 'custbody_ps_billing_sheet_id'
                },
                tranid:{
                    name: 'tranid'
                },
                trandate:{
                    name: 'trandate'
                },
                dueDate:{
                    name: 'duedate'
                },
                dueDate_creditMemo:{
                    name: 'custbody_ps_due_date_cn'
                },
                amount:{
                    name: 'fxamount'
                },
                grossAmount:{
                    name: 'fxgrossamount'
                },
                amountRemaining:{
                    name: 'fxamountremaining'
                },
                amountPaid: {
                    name: 'fxamountpaid'
                },
                currency:{
                    name: 'currency'
                },
                terms:{
                    name: 'terms'
                },
                terms_creditMemo:{
                    name: 'custbody_ps_term_cn'
                },
                account:{
                    name: 'account'
                },
                createdBy:{
                    name: 'createdby'
                },
                internalid:{
                    name: 'internalid'
                },
                arBillingNoteTotal:{
                    name: 'custbody_itl_ar_billingtotal'
                },
                arBillingNoteReference:{
                    name: 'custbody_its_ar_applybilling'
                }
            },
            defaultFilters: {
                type:{
                    INVOICE: 'CustInvc',
                    CREDIT_MEMO: 'CustCred'
                },
                status:{
                    INVOICE_OPEN: 'CustInvc:A',
                    CREDIT_MEMO_OPEN: 'CustCred:A'
                },
                mainline:{
                    T: 'T'
                },
                billingSheetId:{
                    NONE: '@NONE@'
                },
                arBillingNoteReference:{
                    NONE: '@NONE@'
                }
            }
        },
        INVOICE = {
            recordType: 'invoice',
            fields:{
                status: {
                    id: 'status'
                },
                arBillingNoteReference:{
                    id: 'custbody_its_ar_applybilling'
                }
            },
            defaults: {
                status: {
                    PAID_IN_FULL: 'Paid In Full'
                }
            }
        },
        CREDIT_MEMO = {
            recordType: 'creditmemo',
            fields:{
                arBillingNoteReference:{
                    id: 'custbody_its_ar_applybilling'
                }
            }
        },

        CUSTOMER_PAYMENT = {
            recordType: 'customerpayment',
          fields:{}
          
        }

    return { UI, AR_BILLING_NOTE_RECORD, AR_BILLNOTE_PROCESSED_TRANSACTIONS, TRANSACTION_SEARCH, INVOICE, CREDIT_MEMO, CUSTOMER_PAYMENT }
})