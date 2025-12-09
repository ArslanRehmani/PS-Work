define([], ()=>{

    const
        TRANSACTION = {
            queryType: 'transaction',
            fields:{
                id:{
                    qCol: 'id'
                },
                recordType:{
                    qCol: 'recordtype'
                }
            },
            defaults:{
                recordType:{
                    INVOICE: 'invoice',
                    CREDIT_MEMO: 'creditmemo'
                }
            }
        },
        INVOICE = {
            recordType: 'invoice',
            fields: {
                status: { id: 'status' }
            },
            defaults: {
                status: {
                    PAID_IN_FULL: 'Paid In Full'
                }
            }
        },
        CREDIT_MEMO = {
            recordType: 'creditMemo',
            fields: {
                status: { id: 'status' }
            },
            defaults: {
                status: {
                    FULLY_APPLIED: 'Fully Applied'
                }
            }
        },
        CUSTOMER_PAYMENT = {
            recordType: 'customerpayment',
            fields:{
                arBillingNoteReference:{
                    id: 'custbody_its_ar_applybilling'
                }
            },
            sublists:{
                APPLY: {
                    type: 'apply',
                    fields:{
                        apply: {
                            id: 'apply'
                        },
                        internalId: {
                            id: 'internalid'
                        },
                        due: {
                            id: 'due'
                        },
                        total: {
                            id: 'total'
                        },
                        amount: {
                            id: 'amount'
                        },
                        trantype: {
                            id: 'trantype'
                        }
                    }
                },
                CREDIT: {
                    type: 'credit',
                    fields:{
                        apply: {
                            id: 'apply'
                        },
                        internalId: {
                            id: 'internalid'
                        },
                        due: {
                            id: 'due'
                        },
                        total: {
                            id: 'total'
                        },
                        amount: {
                            id: 'amount'
                        },
                        trantype: {
                            id: 'trantype'
                        }
                    }
                }
            },
            defaults: {
                trantype: {
                    INVOICE: 'CustInvc',
                    CREDITMEMO: 'CustCred'
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
                        dueDate: { id:'custrecord_itl_ar_billing_detail_duedate' },
                        date: { id:'custrecord_itl_ar_billing_detail_date' },
                        terms: { id:'custrecord_itl_ar_billing_detail_terms' },
                        currency: { id:'custrecord_itl_ar_billing_detail_curren' },
                        originalAmount: { id:'custrecord_itl_ar_billing_detail_amount' },
                        billedAmount: { id:'custrecord_itl_ar_billing_detail_billed' },
                        remainingAmount: { id:'custrecord_itl_ar_billing_detail_remain' },
                        billingAmount: { id:'custrecord_itl_ar_billing_detail_billing' },
                        status: { id: 'custrecord_itl_ar_billing_detail_status' }
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
                transactionType: {
                    INVOICE: 'Invoice',
                    CREDIT_MEMO: 'Credit Memo'
                },
                status: {
                    INVOICE_OPEN: 'Invoice:Open',
                    CREDITMEMO_OPEN: 'Credit Memo:Open',
                    INVOICE_PAID_IN_FULL: 'Invoice:Paid In Full',
                    CREDITMEMO_FULLY_APPLIED: 'Credit Memo:Fully Applied'
                }
            }
        }

    return { TRANSACTION, INVOICE, CREDIT_MEMO, CUSTOMER_PAYMENT, AR_BILLING_NOTE_RECORD }
})