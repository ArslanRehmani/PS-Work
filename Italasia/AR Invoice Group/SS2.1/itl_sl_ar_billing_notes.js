/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N', './itl_lib_constants_suitelet.js', './moment.js'], (N, libConstants, moment) => {

    const   
        UI = libConstants.UI,
        INVOICE = libConstants.INVOICE,
        CREDIT_MEMO = libConstants.CREDIT_MEMO,
        AR_BILLING_NOTE_RECORD = libConstants.AR_BILLING_NOTE_RECORD,
        TRANSACTION_SEARCH = libConstants.TRANSACTION_SEARCH;

    const onRequest = (context) => {
        const DATE_FORMAT = N.runtime.getCurrentUser().getPreference({ name: 'DATEFORMAT' });
        const TIME_FORMAT = N.runtime.getCurrentUser().getPreference({ name: 'TIMEFORMAT' });
        if (context.request.method === 'GET') {
            let
                { title, buttons, fields, sublists, fieldGroups, clientScriptModulePath } = UI,
                form = N.ui.serverWidget.createForm({ title }),
                parameters = context.request.parameters,

                suiteletScriptURL = 'https://' + N.url.resolveDomain({
                    hostType: N.url.HostType.APPLICATION
                }) + N.url.resolveScript({
                    scriptId: UI.scriptId,
                    deploymentId: UI.deploymentId
                });

            form.clientScriptModulePath = clientScriptModulePath;

            //Buttons Setup
            Object.values(buttons).forEach((button) => form.addButton(button));

            //FieldGroup Setup
            Object.values(fieldGroups).forEach((fieldGroup) => form.addFieldGroup(fieldGroup) );

            //Fields Setup
            Object.values(fields).forEach((field) => {
                let 
                    fieldObj = form.addField(field);

                fieldObj.isMandatory  = field.isMandatory || false;
                fieldObj.defaultValue = parameters[field.id] || field.defaultValue;

                if(field.displayType)
                    fieldObj.updateDisplayType({
                        displayType: field.displayType,
                    });

                if (field.breakType) 
                    fieldObj.updateBreakType({
                        breakType: field.breakType,
                    });

                if (field.layoutType) 
                    fieldObj.updateLayoutType({
                        layoutType: field.layoutType,
                    });

                if(field.id == UI.fields.term.id){
                    
                    fieldObj.addSelectOption({
                        value: '',
                        text: ''
                    });
                    fieldObj.addSelectOption({
                        value: -99999,
                        text: '-None-'
                    });
                    N.query  
                        .runSuiteQL(`Select id, name From term `)
                        .asMappedResults()
                        .forEach(({id, name}) => {
                            fieldObj.addSelectOption({
                                value: id,
                                text: name
                            })
                        });
                }
            });

            //Sublists Setup
            Object.values(sublists).forEach((sublist) => {
                let
                    sublistObj = form.addSublist(sublist);

                    if(sublist.buttons.markAllButtons)
                        sublistObj.addMarkAllButtons();

                Object.values(sublist.fields).forEach((field) => {
                    let 
                        fieldObj = sublistObj.addField(field);

                    if(field.displayType)
                        fieldObj.updateDisplayType({
                            displayType: field.displayType,
                        });
                });
            });

            //Data Fetching
            let data = fetchData({parameters});

            log.debug('data', data);
            
            //Populating Sublist
            populateSublists({form, data})

            form.addSubmitButton({ label: 'Submit' });

            context.response.writePage(form);
        } 
        else if (context.request.method === 'POST') {
            let 
                data = new Object(),

                request    = context.request,
                lineCount  = request.getLineCount({ group: UI.sublists.transactions.id }),
                parameters = request.parameters;

            data = fetchSubmittedData({request, lineCount, parameters});

            log.debug('fetchSubmittedData', data);
                
            if (!data?.transactionsData || !Object.values(data?.transactionsData).length) {
                context.response.write(`<script>alert('No transactions selected!');window.history.back();</script>`);
                return;
            }

            createARBillingNoteRecord({data});

            N.redirect.toSearchResult({
                search: N.search.load({
                    id: 'customsearch_itl_ar_billing_generated'
                })
            });
        }
    };

    function fetchData({parameters}){
        try{
            let
                PAGE_SIZE = 1000,
                data = new Array(),
                transactionSearch = N.search.create({
                    type: N.search.Type.TRANSACTION,
                    filters: [
                        [
                            TRANSACTION_SEARCH.columns.type.name, N.search.Operator.ANYOF, 
                            [
                                TRANSACTION_SEARCH.defaultFilters.type.INVOICE, 
                                TRANSACTION_SEARCH.defaultFilters.type.CREDIT_MEMO
                            ]
                        ], 'AND',
                        [
                            TRANSACTION_SEARCH.columns.status.name, N.search.Operator.ANYOF, 
                            [
                                TRANSACTION_SEARCH.defaultFilters.status.INVOICE_OPEN, 
                                TRANSACTION_SEARCH.defaultFilters.status.CREDIT_MEMO_OPEN
                            ]
                        ], 'AND',
                        [
                            TRANSACTION_SEARCH.columns.mainline.name, N.search.Operator.IS, 
                            TRANSACTION_SEARCH.defaultFilters.mainline.T
                        ], 
                        'AND',
                        [
                            "formulanumeric: CASE WHEN TO_NUMBER( ({fxamountremaining}) ) - TO_NUMBER( ({custbody_itl_ar_billingtotal}) ) <=0 THEN 0 ELSE 1 END","equalto","1"
                        ],
                        'AND',
                        [
                            TRANSACTION_SEARCH.columns.amountRemaining.name, N.search.Operator.GREATERTHAN, 0
                        ], 
                        'AND',
                        [
                            TRANSACTION_SEARCH.columns.amount.name, N.search.Operator.GREATERTHAN, 0
                        ]
                    ],
                    columns: [
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.entity.name, sort: N.search.Sort.ASC }), 
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.currency.name, sort: N.search.Sort.ASC }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.terms.name, sort: N.search.Sort.ASC }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.terms_creditMemo.name, sort: N.search.Sort.ASC }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.account.name, sort: N.search.Sort.ASC }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.internalid.name }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.tranid.name }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.trandate.name }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.dueDate.name }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.dueDate_creditMemo.name }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.amount.name }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.amountPaid.name }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.grossAmount.name }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.amountRemaining.name }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.status.name }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.type.name }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.createdBy.name }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.arBillingNoteTotal.name }),
                        N.search.createColumn({ name: TRANSACTION_SEARCH.columns.arBillingNoteReference.name })
                    ],
                });

                applyFilters();

                log.debug({
                    title: 'filters',
                    details: transactionSearch.filters
                })
                
                let
                    transSearchPagedData = transactionSearch.runPaged({ pageSize: PAGE_SIZE });

                for (let pageNo = 0; pageNo < transSearchPagedData.pageRanges.length; pageNo++) {

                    transSearchPagedData.fetch(pageNo).data.forEach(result => {
                        
                        data.push({
                            internalid: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.internalid.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.internalid.name)
                            },
                            type: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.type.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.type.name)
                            },
                            entityId: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.entity.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.entity.name)
                            },
                            recordType: {
                                text: result.recordType
                            },
                            tranId: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.tranid.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.tranid.name)
                            },
                            currency: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.currency.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.currency.name)
                            },
                            terms: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.terms.name) || result.getValue(TRANSACTION_SEARCH.columns.terms_creditMemo.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.terms.name) || result.getText(TRANSACTION_SEARCH.columns.terms_creditMemo.name)
                            },
                            accountId: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.account.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.account.name)
                            },
                            dueDate: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.dueDate.name) || result.getValue(TRANSACTION_SEARCH.columns.dueDate_creditMemo.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.dueDate.name) || result.getText(TRANSACTION_SEARCH.columns.dueDate_creditMemo.name)
                            },
                            trandate: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.trandate.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.trandate.name)
                            },
                            amount: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.amount.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.amount.name)
                            },
                            grossAmount: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.grossAmount.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.grossAmount.name)
                            },
                            amountRemaining: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.amountRemaining.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.amountRemaining.name)
                            },
                            amountPaid: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.amountPaid.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.amountPaid.name)
                            },
                            status: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.status.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.status.name)
                            },
                            type: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.type.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.type.name)
                            },
                            createdBy: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.createdBy.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.createdBy.name)
                            },
                            arBillingNoteTotal: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.arBillingNoteTotal.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.arBillingNoteTotal.name)
                            },
                            arBillingNoteReference: {
                                value: result.getValue(TRANSACTION_SEARCH.columns.arBillingNoteReference.name),
                                text: result.getText(TRANSACTION_SEARCH.columns.arBillingNoteReference.name)
                            }
                        });

                        data[data.length-1].billingAmount = {
                            text: data[data.length-1].amountRemaining.value - data[data.length-1].arBillingNoteTotal.value,
                            value: data[data.length-1].amountRemaining.value - data[data.length-1].arBillingNoteTotal.value
                        } 
                        
                    });
                }

                return data;
                
                function applyFilters(){
                    try{
                        
                        if (parameters[UI.fields.customer.id]) {
                            transactionSearch.filters.push(
                                N.search.createFilter({ 
                                    name: TRANSACTION_SEARCH.columns.entity.name,
                                    operator: N.search.Operator.ANYOF,
                                    values: parameters[UI.fields.customer.id].split('\u0005').filter(x=>x),
                                })
                            );
                        }
                        if (parameters[UI.fields.currency.id]) {
                            transactionSearch.filters.push(
                                N.search.createFilter({ 
                                    name: TRANSACTION_SEARCH.columns.currency.name,
                                    operator: N.search.Operator.ANYOF,
                                    values: parameters[UI.fields.currency.id],
                                })
                            );
                        }
                        if (parameters[UI.fields.term.id]) {
                            transactionSearch.filters.push(
                                N.search.createFilter({ 
                                    name: TRANSACTION_SEARCH.columns.terms.name,
                                    operator: N.search.Operator.ANYOF,
                                    values: (parameters[UI.fields.term.id] == -99999)? "@NONE@" : parameters[UI.fields.term.id]
                                }),
                                N.search.createFilter({ 
                                    name: TRANSACTION_SEARCH.columns.terms_creditMemo.name,
                                    operator: N.search.Operator.ANYOF,
                                    values: (parameters[UI.fields.term.id] == -99999)? "@NONE@" : parameters[UI.fields.term.id]
                                })
                            );  
                        }
                        if (parameters[UI.fields.account.id]) {
                            transactionSearch.filters.push(
                                N.search.createFilter({ 
                                    name: TRANSACTION_SEARCH.columns.account.name,
                                    operator: N.search.Operator.ANYOF,
                                    values: parameters[UI.fields.account.id],
                                })
                            );
                        }
                        if (parameters[UI.fields.fromDate.id] && parameters[UI.fields.toDate.id]) {
                            transactionSearch.filters.push(
                                N.search.createFilter({ 
                                    name: TRANSACTION_SEARCH.columns.trandate.name,
                                    operator: N.search.Operator.WITHIN,
                                    values: [parameters[UI.fields.fromDate.id], parameters[UI.fields.toDate.id]],
                                })
                            );
                        } 
                        else if (parameters[UI.fields.fromDate.id]) {
                            transactionSearch.filters.push(
                                N.search.createFilter({ 
                                    name: TRANSACTION_SEARCH.columns.trandate.name,
                                    operator: N.search.Operator.ONORAFTER,
                                    values: parameters[UI.fields.fromDate.id],
                                })
                            );
                        } 
                        else if (parameters[UI.fields.toDate.id]) {
                            transactionSearch.filters.push(
                                N.search.createFilter({ 
                                    name: TRANSACTION_SEARCH.columns.trandate.name,
                                    operator: N.search.Operator.ONORBEFORE,
                                    values: parameters[UI.fields.toDate.id],
                                })
                            );
                        }
                        else if (parameters[UI.fields.createdBy.id]) {
                            transactionSearch.filters.push(
                                N.search.createFilter({ 
                                    name: TRANSACTION_SEARCH.columns.createdBy.name,
                                    operator: N.search.Operator.ANYOF,
                                    values: parameters[UI.fields.createdBy.id],
                                })
                            );
                        }
                    }
                    catch(e){
                        log.error('Failed to applyFilters()', e);
                    }
                }
        }
        catch(e){
            log.error('Failed to fetch data', e);
        }
    }
    
    function populateSublists({form, data}){
        try{
            let
                sublistObj = form.getSublist(UI.sublists.transactions.id);

            data.forEach((d, rowNo) => {
                let
                    uiSublistFields = Object.values(UI.sublists.transactions.fields).filter(sfield => sfield.dataReference);

                uiSublistFields.forEach(sfield => {
                    if(d[sfield.dataReference]?.value || d[sfield.dataReference]?.text)
                        sublistObj.setSublistValue({
                            id: sfield.id,
                            line: rowNo,
                            value: sfield.fetchValue ? d[sfield.dataReference].value : d[sfield.dataReference].text

                        });
                });
            });
        }
        catch(e){
            log.error('Failed to populateSublists()', e);
            return;
        }
    }
    
    function fetchSubmittedData({request, lineCount, parameters}){
        try{
            let 
                filtersData = new Object(),
                transactionsData = new Object();

                
            Object.values(UI.fields).forEach(field => {
                if(parameters[field.id])
                    filtersData[field.id] = parameters[field.id];
            });

            for (let i = 0; i < lineCount; i++) {
                let 
                    isTransactonSelected = request.getSublistValue({
                        group: UI.sublists.transactions.id,
                        name: UI.sublists.transactions.fields.checkBox.id,
                        line: i,
                    });

                if (isTransactonSelected === 'T' || isTransactonSelected === true){
                    
                    let
                        key = new String(),
                        transactionData = new Object();

                    Object.values(UI.sublists.transactions.fields).filter(sfield => {
                        transactionData[sfield.id] = request.getSublistValue({
                            group: UI.sublists.transactions.id,
                            name: sfield.id,
                            line: i,
                        })
                    });

                    key = (transactionData[UI.sublists.transactions.fields.customerCode.id] || "") + '|:|' + (transactionData[UI.sublists.transactions.fields.currencyCode.id] || "") 
                        + "|:|" + (transactionData[UI.sublists.transactions.fields.termId.id] || "");

                    log.debug('{key, transactionData}', {key, transactionData});

                    if(!transactionsData[key])
                        transactionsData[key] = [ transactionData ];
                    else
                        transactionsData[key].push( transactionData );
                }
            }

            return {transactionsData, filtersData};
        }
        catch(err){
            log.debug('ERR! Found In fetchSubmittedData()', err)
        }
    }
    
    function createARBillingNoteRecord({data}){
        try{
            Object.values(data.transactionsData).forEach(tranData => {
                let 
                    arBillingNoteRecord = N.record.create({
                        type: AR_BILLING_NOTE_RECORD.recordType
                    });

                Object.values(AR_BILLING_NOTE_RECORD.fields).forEach(field => {
                    log.debug('Test', {
                        fieldId: field.id,
                        value: (
                            (field.id == AR_BILLING_NOTE_RECORD.fields.date.id)?
                                moment(data.filtersData[field.dataReference], DATE_FORMAT).toDate() || new Date()
                            :(field.id == AR_BILLING_NOTE_RECORD.fields.dueDate.id)?
                                (data.filtersData[field.dataReference])? moment(data.filtersData[field.dataReference], DATE_FORMAT).toDate() :null
                            :
                                tranData[0][field.dataReference] || null
                        )
                    });
                    arBillingNoteRecord.setValue({
                        fieldId: field.id,
                        value: (
                            (field.id == AR_BILLING_NOTE_RECORD.fields.date.id)?
                                moment(data.filtersData[field.dataReference], DATE_FORMAT).toDate() || new Date()
                            :(field.id == AR_BILLING_NOTE_RECORD.fields.dueDate.id)?
                                (data.filtersData[field.dataReference])? moment(data.filtersData[field.dataReference], DATE_FORMAT).toDate() :null
                            :
                                tranData[0][field.dataReference] || null
                        )
                    });
                });
                
                let 
                    arBillingNoteRecordId = arBillingNoteRecord.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });
                
                arBillingNoteRecord = N.record.load({
                    type: AR_BILLING_NOTE_RECORD.recordType,
                    id: arBillingNoteRecordId,
                })

                tranData.forEach((tData, lineNo) => {
                    log.debug('tData', tData);
                    let 
                        date                   = tData[UI.sublists.transactions.fields.date.id],
                        terms                  = tData[UI.sublists.transactions.fields.terms.id],
                        status                 = tData[UI.sublists.transactions.fields.status.id],
                        termId                 = tData[UI.sublists.transactions.fields.termId.id],
                        account                = tData[UI.sublists.transactions.fields.account.id],
                        dueDate                = tData[UI.sublists.transactions.fields.dueDate.id],
                        tranType               = tData[UI.sublists.transactions.fields.tranType.id],
                        currency               = tData[UI.sublists.transactions.fields.currency.id],
                        customer               = tData[UI.sublists.transactions.fields.customer.id],
                        recordId               = tData[UI.sublists.transactions.fields.internalId.id],
                        createdBy              = tData[UI.sublists.transactions.fields.createdBy.id],
                        recordType             = tData[UI.sublists.transactions.fields.recordType.id],
                        createdById            = tData[UI.sublists.transactions.fields.createdById.id],
                        accountCode            = tData[UI.sublists.transactions.fields.accountCode.id],
                        dueDateBody            = data.filtersData[UI.fields.billingDueDate.id],
                        customerCode           = tData[UI.sublists.transactions.fields.customerCode.id],
                        currencyCode           = tData[UI.sublists.transactions.fields.currencyCode.id],
                        billedAmount           = tData[UI.sublists.transactions.fields.billedAmount.id],
                        billingAmount          = tData[UI.sublists.transactions.fields.billingAmount.id],
                        originalAmount         = tData[UI.sublists.transactions.fields.originalAmount.id],
                        documentNumber         = tData[UI.sublists.transactions.fields.documentNumber.id], 
                        remainingAmount        = tData[UI.sublists.transactions.fields.remainingAmount.id],
                        arBillingNoteTotal     = tData[UI.sublists.transactions.fields.arBillingNoteTotal.id],
                        arBillingNoteReference = tData[UI.sublists.transactions.fields.arBillingNoteReference.id];

                    arBillingNoteRecord.setSublistValue({
                        sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                        fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.type.id,
                        line: lineNo,
                        value: tranType
                    });
                    arBillingNoteRecord.setSublistValue({
                        sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                        fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.documentNumber.id,
                        line: lineNo,
                        value: recordId
                    });
                    arBillingNoteRecord.setSublistValue({
                        sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                        fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.customer.id,
                        line: lineNo,
                        value: customerCode
                    });
                    arBillingNoteRecord.setSublistValue({
                        sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                        fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.account.id,
                        line: lineNo,
                        value: accountCode
                    });
                    if(dueDate)
                        arBillingNoteRecord.setSublistValue({
                            sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                            fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.dueDate.id,
                            line: lineNo,
                            value: moment(dueDate, DATE_FORMAT).toDate()
                        });
                    arBillingNoteRecord.setSublistValue({
                        sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                        fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.date.id,
                        line: lineNo,
                        value: moment(date, DATE_FORMAT).toDate()
                    });
                    if(termId)
                        arBillingNoteRecord.setSublistValue({
                            sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                            fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.terms.id,
                            line: lineNo,
                            value: termId
                        });
                    arBillingNoteRecord.setSublistValue({
                        sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                        fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.currency.id,
                        line: lineNo,
                        value: currencyCode
                    });
                    arBillingNoteRecord.setSublistValue({
                        sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                        fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.createdBy.id,
                        line: lineNo,
                        value: createdById
                    });
                    arBillingNoteRecord.setSublistValue({
                        sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                        fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.originalAmount.id,
                        line: lineNo,
                        value: originalAmount
                    });
                    arBillingNoteRecord.setSublistValue({
                        sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                        fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.billedAmount.id,
                        line: lineNo,
                        value: billedAmount
                    });
                    arBillingNoteRecord.setSublistValue({
                        sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                        fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.remainingAmount.id,
                        line: lineNo,
                        value: remainingAmount
                    });
                    arBillingNoteRecord.setSublistValue({
                        sublistId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.id,
                        fieldId: AR_BILLING_NOTE_RECORD.sublists.PROCESSED_TRANSACTIONS.fields.billingAmount.id,
                        line: lineNo,
                        value: billingAmount
                    });
                    
                    log.debug('test', {
                        custbody_its_ar_applybilling:  arBillingNoteReference? [...(arBillingNoteReference.split(',')), arBillingNoteRecordId]: [arBillingNoteRecordId],
                        ...(
                            (!!dueDateBody && recordType == INVOICE.recordType)?
                                {
                                    [TRANSACTION_SEARCH.columns.dueDate.name]:  moment(dueDateBody, DATE_FORMAT).toDate()
                                }
                            :(!!dueDateBody && recordType == CREDIT_MEMO.recordType)?
                                {
                                    [TRANSACTION_SEARCH.columns.dueDate_creditMemo.name]:  moment(dueDateBody, DATE_FORMAT).toDate()
                                }
                            : {}
                        )
                    });

                    N.record.submitFields({
                        type: recordType,
                        id: recordId,
                        values: {
                            custbody_its_ar_applybilling:  arBillingNoteReference? [...(arBillingNoteReference.split(',')), arBillingNoteRecordId]: [arBillingNoteRecordId],
                            custbody_itl_ar_billingtotal: Number(String(arBillingNoteTotal).replace(/[^0-9.]/g,'')) + Number(String(billingAmount).replace(/[^0-9.]/g,'')),
                            ...(
                                (!!dueDateBody && recordType == INVOICE.recordType)?
                                    {
                                        [TRANSACTION_SEARCH.columns.dueDate.name]:  moment(dueDateBody, DATE_FORMAT).toDate()
                                    }
                                :(!!dueDateBody && recordType == CREDIT_MEMO.recordType)?
                                    {
                                        [TRANSACTION_SEARCH.columns.dueDate_creditMemo.name]:  moment(dueDateBody, DATE_FORMAT).toDate()
                                    }
                                : {}
                            )
                        },
                        options: {
                            enablesourcing: true
                        }
                    })
                });
                
                arBillingNoteRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
                
            });
        }
        catch(err){
            log.debug('ERR! Found In createARBillingNoteRecord()', err)
        }
    }

    return { onRequest };
});