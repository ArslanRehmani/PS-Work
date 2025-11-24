/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/ui/serverWidget", "N/search", "N/task", "N/redirect", "N/runtime", "N/record", "N/file"], (
    serverWidget,
    search,
    task,
    redirect,
    runtime,
    record,
    file
) => {
    /**
     * Defines the Suitelet script trigger point.
     * @param {Object} scriptContext
     * @param {ServerRequest} scriptContext.request - Incoming request
     * @param {ServerResponse} scriptContext.response - Suitelet response
     * @since 2015.2
     */
    const onRequest = (scriptContext) => {
        try {
            /** ************************* GET REQUEST ************************************* */

            if (scriptContext.request.method == "GET") {
                var scriptObj = runtime.getCurrentScript();
                let processingStatusParam = scriptObj.getParameter({
                    name: "custscript_ps_sl_rev_rec_process_status",
                });

                // let rentalPeriodParam = scriptContext.request.parameters.rentalPeriod;
                let postingPeriodParam = scriptContext.request.parameters.postingPeriod || "";
                let customerParam = scriptContext.request.parameters.customer || "";
                let submitFlag = scriptContext.request.parameters.submit;
                let exportFlag = scriptContext.request.parameters.export;
                let rentalMonthParam = scriptContext.request.parameters.rentalMonthParam || "";
                let subsidiaryParam = scriptContext.request.parameters.subsidiary_filter || "";
                let csvContent = "";

                var form = serverWidget.createForm({
                    title: "Revenue Recognition",
                });

                form.clientScriptModulePath = "SuiteScripts/PointStar Customizations/Revenue Recognition/ps_cs_revenue_recognition.js";

                form.addButton({
                    id: "refresh_button",
                    label: "Refresh",
                    functionName: "refreshPage()",
                });

                //RENTAL PERIOD FILTER

                // var rentalPeriod = form.addField({
                //   id: "rental_period",
                //   type: serverWidget.FieldType.SELECT,
                //   label: "Rental Period",
                // });

                // rentalPeriod.isMandatory = true;

                // rentalPeriod.addSelectOption({
                //   value: "",
                //   text: "",
                //   isSelected: false,
                // });

                let accountingPeriods = getAccountingPeriods();

                // for (m in accountingPeriods) {
                //   rentalPeriod.addSelectOption({
                //     value: accountingPeriods[m].internalID,
                //     text: accountingPeriods[m].name,
                //     isSelected: true,
                //   });
                // }

                //POSTING PERIOD FILTER

                var postingPeriod = form.addField({
                    id: "posting_period",
                    type: serverWidget.FieldType.SELECT,
                    label: "Posting Period",
                });
                postingPeriod.isMandatory = true;

                postingPeriod.addSelectOption({
                    value: "",
                    text: "",
                    isSelected: false,
                });

                for (m in accountingPeriods) {
                    postingPeriod.addSelectOption({
                        value: accountingPeriods[m].internalID,
                        text: accountingPeriods[m].name,
                        isSelected: true,
                    });
                }

                postingPeriod.defaultValue = postingPeriodParam;

                // CUSTOMER
                var customer = form.addField({
                    id: "customer",
                    type: serverWidget.FieldType.SELECT,
                    label: "Customer",
                    source: "customer",
                });
                customer.defaultValue = customerParam;

                var memoField = form.addField({
                    id: "invoicerec_memo",
                    type: serverWidget.FieldType.TEXT,
                    label: "Memo",
                });

                // PROCESSING STATUS
                var processingStatus = form
                    .addField({
                        id: "processing_status",
                        type: serverWidget.FieldType.SELECT,
                        label: "Processing Status",
                        source: "customlist_ps_sl_rev_rec_process_stat",
                    })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE,
                    });

                processingStatus.defaultValue = processingStatusParam;


                // Rental Month
                var rentalMonth = form.addField({
                    id: "rental_month",
                    type: serverWidget.FieldType.SELECT,
                    label: "Rental Month"
                });

                rentalMonth.addSelectOption({
                    value: "",
                    text: "",
                    isSelected: false,
                });

                for (m in accountingPeriods) {
                    rentalMonth.addSelectOption({
                        value: accountingPeriods[m].internalID,
                        text: accountingPeriods[m].name,
                        isSelected: true,
                    });
                }

                rentalMonth.defaultValue = rentalMonthParam;

                //SUBLIST

                invoicesSublist = form.addSublist({
                    id: "invoices",
                    type: serverWidget.SublistType.LIST,
                    label: "Invoices",
                });
                invoicesSublist.addField({
                    id: "select_invoices",
                    type: serverWidget.FieldType.CHECKBOX,
                    label: "Select",
                });
                invoicesSublist.addField({
                    id: "invoices_internalid",
                    type: serverWidget.FieldType.INTEGER,
                    label: "Internal ID",
                });
                csvContent += "Internal ID,";
                invoicesSublist.addField({
                    id: "invoices_date",
                    type: serverWidget.FieldType.TEXT,
                    label: "Date",
                });
                csvContent += "Date,";
                rentalPeriodSublistField = invoicesSublist
                    .addField({
                        id: "invoices_rental_period",
                        type: serverWidget.FieldType.SELECT,
                        label: "Rental Period",
                    })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE,
                    });

                for (m in accountingPeriods) {
                    rentalPeriodSublistField.addSelectOption({
                        value: accountingPeriods[m].internalID,
                        text: accountingPeriods[m].name,
                        isSelected: false,
                    });
                }

                invoicesSublist.addField({
                    id: "invoices_id",
                    type: serverWidget.FieldType.TEXT,
                    label: "Document Number",
                });
                csvContent += "Document Number,";

                invoicesSublist.addField({
                    id: "invoices_transactionnumber",
                    type: serverWidget.FieldType.TEXT,
                    label: "Transaction Number",
                });
                csvContent += "Transaction Number,";
                invoicesSublist
                    .addField({
                        id: "invoices_entity",
                        type: serverWidget.FieldType.SELECT,
                        label: "Name",
                        source: "customer",
                    })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE,
                    });
                csvContent += "Name,";

                // invoicesSublist
                //     .addField({
                //         id: "invoices_account",
                //         type: serverWidget.FieldType.SELECT,
                //         label: "Account",
                //         source: "account",
                //     })
                //     .updateDisplayType({
                //         displayType: serverWidget.FieldDisplayType.INLINE,
                //     });
                // csvContent += "Account,";

                invoicesSublist.addField({
                    id: "invoices_status",
                    type: serverWidget.FieldType.TEXT,
                    label: "Invoice Status",
                });
                csvContent += "Invoice Status,";

                invoicesSublist.addField({
                    id: "invoice_memo",
                    type: serverWidget.FieldType.TEXT,
                    label: "Memo",
                });

                var sublistSub = invoicesSublist
                    .addField({
                        id: "invoices_subsidiary",
                        type: serverWidget.FieldType.SELECT,
                        label: "Invoice Subsidiary",
                        //  source: "subsidiary",
                    })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE,
                    });
                var subsidiarySearch = search.create({
                    type: search.Type.SUBSIDIARY,
                    columns: ['namenohierarchy']
                });

                var results = subsidiarySearch.run().getRange({ start: 0, end: 1000 });

                results.forEach(function (result) {
                    sublistSub.addSelectOption({
                        value: result.id,
                        text: result.getValue('namenohierarchy'),
                        isSelected: (result.id == subsidiaryParam)
                    });
                });
                csvContent += "Subsidiary,";

                invoicesSublist.addField({
                    id: "invoices_amount",
                    type: serverWidget.FieldType.CURRENCY,
                    label: "Invoice Amount",
                });
                csvContent += "Amount,";

                // invoicesSublist
                //     .addField({
                //         id: "invoices_income_account",
                //         type: serverWidget.FieldType.SELECT,
                //         label: "Income Account",
                //         source: "account",
                //     })
                //     .updateDisplayType({
                //         displayType: serverWidget.FieldDisplayType.HIDDEN,
                //     });

                // invoicesSublist
                //     .addField({
                //         id: "invoices_actual_revenue_account",
                //         type: serverWidget.FieldType.SELECT,
                //         label: "Actual Revenue Account",
                //         source: "account",
                //     })
                //     .updateDisplayType({
                //         displayType: serverWidget.FieldDisplayType.HIDDEN,
                //     });

                invoicesSublist.addMarkAllButtons();

                //POPULATE SUBLIST
                log.debug("submitFlag", submitFlag);
                log.debug("exportFlag", exportFlag);

                if (submitFlag) {
                    //GET AND POPULATE INVOICES ON SUBLIST

                    // let invoices = getInvoices(
                    //   rentalPeriodParam,
                    //   postingPeriodParam,
                    //   customerParam
                    // );
                    let invoices = getInvoices(postingPeriodParam, customerParam, rentalMonthParam, subsidiaryParam);
                    log.debug("invoices", invoices);

                    for (var i = 0; i < invoices.length; i++) {
                        csvContent += "\n";
                        invoicesSublist.setSublistValue({
                            id: "invoices_internalid",
                            line: i,
                            value: invoices[i].internalID,
                        });
                        csvContent += invoices[i].internalID + ",";

                        invoicesSublist.setSublistValue({
                            id: "invoices_date",
                            line: i,
                            value: invoices[i].date,
                        });
                        csvContent += invoices[i].date + ",";

                        invoicesSublist.setSublistValue({
                            id: "invoices_rental_period",
                            line: i,
                            value: isEmpty(invoices[i].rentalPeriod) ? " " : invoices[i].rentalPeriod,
                        });

                        invoicesSublist.setSublistValue({
                            id: "invoices_id",
                            line: i,
                            value: invoices[i].documentNumber,
                        });
                        csvContent += invoices[i].documentNumber + ",";

                        invoicesSublist.setSublistValue({
                            id: "invoices_transactionnumber",
                            line: i,
                            value: invoices[i].transactionNumber,
                        });
                        csvContent += invoices[i].transactionNumber + ",";

                        invoicesSublist.setSublistValue({
                            id: "invoices_entity",
                            line: i,
                            value: invoices[i].name,
                        });
                        csvContent += invoices[i].customerName + ",";

                        // invoicesSublist.setSublistValue({
                        //     id: "invoices_account",
                        //     line: i,
                        //     value: invoices[i].account,
                        // });
                        // csvContent += invoices[i].accountName + ",";

                        invoicesSublist.setSublistValue({
                            id: "invoices_status",
                            line: i,
                            value: invoices[i].status,
                        });
                        csvContent += invoices[i].status + ",";

                        invoicesSublist.setSublistValue({
                            id: "invoices_memo",
                            line: i,
                            value: isEmpty(invoices[i].memo) ? " " : invoices[i].memo,
                        });

                        invoicesSublist.setSublistValue({
                            id: "invoices_subsidiary",
                            line: i,
                            value: invoices[i].subsidiary,
                        });
                        csvContent += invoices[i].subsidiaryName + ",";

                        // log.debug("subsi", invoices[i].subsidiary + "  name " + invoices[i].subsidiaryName)
                        // invoicesSublist.setSublistValue({
                        //     id: "invoices_income_account",
                        //     line: i,
                        //     value: invoices[i].incomeAccount,
                        // });

                        // invoicesSublist.setSublistValue({
                        //     id: "invoices_actual_revenue_account",
                        //     line: i,
                        //     value: invoices[i].actualRevenueAccount,
                        // });

                        if (!!invoices[i].department) {
                            invoicesSublist.setSublistValue({
                                id: "invoices_department",
                                line: i,
                                value: invoices[i].department,
                            });
                        }

                        if (!!invoices[i].class) {
                            invoicesSublist.setSublistValue({
                                id: "invoices_class",
                                line: i,
                                value: invoices[i].class,
                            });
                        }
                        invoicesSublist.setSublistValue({
                            id: "invoices_amount",
                            line: i,
                            value: invoices[i].amount,
                        });
                        csvContent += invoices[i].amount + ",";
                    }

                    if (exportFlag) {
                        __exportToCSV(csvContent, scriptContext.response);
                        return;
                    }
                }

                if (processingStatusParam != "1") {
                    var postingDate = form.addField({
                        id: "posting_date",
                        type: serverWidget.FieldType.DATE,
                        label: "Posting Date",
                    });

                    postingDate.isMandatory = true;
                    form.addSubmitButton({
                        label: "Submit",
                    });

                    //SUBSIDIARY FILTER

                    var subsidiaryField = form.addField({
                        id: 'subsidiary_filter',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Subsidiary',
                    });
                    subsidiaryField.isMandatory = true;

                    subsidiaryField.addSelectOption({
                        value: '',
                        text: '',
                        isSelected: false
                    });

                    var subsidiarySearch = search.create({
                        type: search.Type.SUBSIDIARY,
                        columns: ['namenohierarchy']
                    });

                    var results = subsidiarySearch.run().getRange({ start: 0, end: 1000 });

                    results.forEach(function (result) {
                        subsidiaryField.addSelectOption({
                            value: result.id,
                            text: result.getValue('namenohierarchy'),
                            isSelected: (result.id == subsidiaryParam)
                        });
                    });
                    log.debug({
                        title: 'Subsidiary',
                        details: 'Total Subsidiaries' + results.length,
                    });

                    if (subsidiaryParam) {
                        subsidiaryField.defaultValue = subsidiaryParam;
                    }

                    form.addButton({
                        id: "export_to_csv",
                        label: "Export to CSV",
                        functionName: "exportToCSV()",
                    });
                }

                scriptContext.response.writePage(form);
            } else {
                log.debug("scriptContext.request.parameters ", scriptContext.request.parameters);

                let posting_date = scriptContext.request.parameters.posting_date;
                let invoicerec_memo = scriptContext.request.parameters.invoicerec_memo;

                lineCount = scriptContext.request.getLineCount({
                    group: "invoices",
                });
                let selectedInvoices = [];

                for (var i = 0; i < lineCount; i++) {
                    let selectedInvoice = scriptContext.request.getSublistValue({
                        group: "invoices",
                        name: "select_invoices",
                        line: i,
                    });

                    if (selectedInvoice == "T") {
                        let invoiceInternalID = scriptContext.request.getSublistValue({
                            group: "invoices",
                            name: "invoices_internalid",
                            line: i,
                        });

                        // let invoiceID = scriptContext.request.getSublistValue({
                        //     group: "invoices",
                        //     name: "invoices_id",
                        //     line: i,
                        // });

                        let invoiceSubsidiary = scriptContext.request.getSublistValue({
                            group: "invoices",
                            name: "invoices_subsidiary",
                            line: i,
                        });

                        // let invoiceAmount = scriptContext.request.getSublistValue({
                        //     group: "invoices",
                        //     name: "invoices_amount",
                        //     line: i,
                        // });

                        // let name = scriptContext.request.getSublistValue({
                        //     group: "invoices",
                        //     name: "invoices_entity",
                        //     line: i,
                        // });

                        // let invoiceDepartment =
                        //     scriptContext.request.getSublistValue({
                        //         group: "invoices",
                        //         name: "invoices_department",
                        //         line: i,
                        //     }) || "";

                        // let invoiceClass =
                        //     scriptContext.request.getSublistValue({
                        //         group: "invoices",
                        //         name: "invoices_class",
                        //         line: i,
                        //     }) || "";

                        // let invoiceActualRevenueAccount =
                        //     scriptContext.request.getSublistValue({
                        //         group: "invoices",
                        //         name: "invoices_actual_revenue_account",
                        //         line: i,
                        //     }) || "";

                        // let invoiceIncomeAccount =
                        //     scriptContext.request.getSublistValue({
                        //         group: "invoices",
                        //         name: "invoices_income_account",
                        //         line: i,
                        //     }) || "";

                        selectedInvoices.push({
                            invoiceInternalID: invoiceInternalID,
                            invoiceSubsidiary: invoiceSubsidiary,
                            postingDate: posting_date || null,
                            invoiceMemo: invoicerec_memo || ""
                        });

                        // let invoiceIndex = selectedInvoices.findIndex((invoice) => invoice.invoiceInternalID == invoiceInternalID);

                        // if (invoiceIndex >= 0) {
                        //     selectedInvoices[invoiceIndex].invoiceAmount =
                        //         parseFloat(selectedInvoices[invoiceIndex].invoiceAmount) + parseFloat(invoiceAmount);
                        // } else {
                        //     selectedInvoices.push({
                        //         invoiceInternalID: invoiceInternalID,
                        //         invoiceID: invoiceID,
                        //         invoiceSubsidiary: invoiceSubsidiary,
                        //         invoiceAmount: invoiceAmount,
                        //         name: name,
                        //         invoiceDepartment: invoiceDepartment,
                        //         invoiceClass: invoiceClass,
                        //         postingDate: posting_date || null,
                        //         invoiceActualRevenueAccount: invoiceActualRevenueAccount,
                        //         invoiceIncomeAccount: invoiceIncomeAccount,
                        //     });
                        // }
                    }
                }

                log.debug("selectedInvoices are ", selectedInvoices);

                if (selectedInvoices.length > 0) {
                    var mapReduceTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: "customscript_ps_mr_revenue_recognition",
                        deploymentId: "customdeploy_ps_mr_revenue_recognition",
                        params: {
                            custscript_ps_mr_rev_rec_selectedinvoice: JSON.stringify(selectedInvoices),
                        },
                    });

                    let mapReduceTaskID = mapReduceTask.submit();

                    if (mapReduceTaskID) {
                        record.submitFields({
                            type: record.Type.SCRIPT_DEPLOYMENT,
                            id: 407,
                            values: {
                                custscript_ps_sl_rev_rec_process_status: "1",
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true,
                            },
                        });

                        redirect.toSuitelet({
                            scriptId: "customscript_ps_sl_revenue_recognition",
                            deploymentId: "customdeploy_ps_sl_revenue_recognition",
                            parameters: {
                                success: true,
                            },
                        });
                    }
                } else {
                    redirect.toSuitelet({
                        scriptId: "customscript_ps_sl_revenue_recognition",
                        deploymentId: "customdeploy_ps_sl_revenue_recognition",
                        parameters: {
                            success: false,
                        },
                    });
                }
            }
        } catch (e) {
            log.error("onRequest error", e);

            redirect.toSuitelet({
                scriptId: "customscript_ps_sl_revenue_recognition",
                deploymentId: "customdeploy_ps_sl_revenue_recognition",
                parameters: {
                    success: false,
                },
            });
        }
    };

    function __exportToCSV(csvContent, response) {
        log.debug("csvContent", csvContent);
        var fileObj = file.create({
            name: "Revenue Recognition Report.csv",
            fileType: file.Type.CSV,
            contents: csvContent,
            encoding: file.Encoding.UTF8,
            folder: 1361,
        });

        var fileID = fileObj.save();
        // update code Arslan
        response.writeFile({
            file: fileObj,
            isInline: false  // false triggers download, true would display in browser
        });
    }

    function getInvoices(postingPeriod, customer, rentalMonthParam, subsidiary) {
        let invoices = [];

        var invoiceSearchObj = search.load("customsearch172");
        var defaultFilters = invoiceSearchObj.filters;

        if (!isEmpty(postingPeriod)) {
            defaultFilters.push(
                search.createFilter({
                    name: "postingperiod",
                    operator: search.Operator.ANYOF,
                    values: [postingPeriod],
                })
            );
        }

        if (!isEmpty(customer)) {
            defaultFilters.push(
                search.createFilter({
                    name: "entity",
                    operator: search.Operator.ANYOF,
                    values: [customer],
                })
            );
        }
        if (!isEmpty(rentalMonthParam)) {
            defaultFilters.push(
                search.createFilter({
                    name: "custbody_rental_month_dormprint",
                    operator: search.Operator.ANYOF,
                    values: [rentalMonthParam],
                })
            );
        }

        if (!isEmpty(subsidiary)) {
            defaultFilters.push(
                search.createFilter({
                    name: "subsidiary",
                    operator: search.Operator.ANYOF,
                    values: [subsidiary],
                })
            );
        }
        // if (!isEmpty(subsidiary)) {
        //     defaultFilters.push(
        //         search.createFilter({
        //             name: "subsidiarynohierarchy",
        //             operator: search.Operator.ANYOF,
        //             values: [subsidiary],
        //         })
        //     );
        // }      



        invoiceSearchObj.filters = defaultFilters;

        // let results = invoiceSearchObj.run().getRange(0, 1000);

        invoiceSearchObj.run().each((result) => {
            invoices.push({
                internalID: result.getValue(invoiceSearchObj.columns[12]),
                date: result.getValue(invoiceSearchObj.columns[0]),
                rentalPeriod: result.getValue(invoiceSearchObj.columns[1]),
                documentNumber: result.getValue(invoiceSearchObj.columns[3]),
                transactionNumber: result.getValue(invoiceSearchObj.columns[4]),
                name: result.getValue(invoiceSearchObj.columns[5]),
                customerName: result.getText(invoiceSearchObj.columns[5]),
                status: result.getText(invoiceSearchObj.columns[6]),
                memo: result.getValue(invoiceSearchObj.columns[7]),
                amount: result.getValue(invoiceSearchObj.columns[8]),
                subsidiary: result.getValue(invoiceSearchObj.columns[9]),
                subsidiaryName: result.getText(invoiceSearchObj.columns[9]),
                department: result.getValue(invoiceSearchObj.columns[10]),
                class: result.getValue(invoiceSearchObj.columns[11]),
            });
            return true;
        });
        // for (var i = 0; i < results.length; i++) {
        //     invoices.push({
        //         internalID: results[i].id,
        //         date: results[i].getValue(columns[0]),
        //         rentalPeriod: results[i].getValue(invoiceSearchObj.columns[1]),
        //         documentNumber: results[i].getValue(invoiceSearchObj.columns[3]),
        //         transactionNumber: results[i].getText(invoiceSearchObj.columns[4]),
        //         name: results[i].getValue(invoiceSearchObj.columns[5]),
        //         customerName: results[i].getText(invoiceSearchObj.columns[5]),
        //         status: results[i].getValue(invoiceSearchObj.columns[6]),
        //         memo: results[i].getValue(invoiceSearchObj.columns[7]),
        //         amount: results[i].getValue(invoiceSearchObj.columns[8]),
        //         subsidiary: results[i].getValue(invoiceSearchObj.columns[9]),
        //         subsidiaryName: results[i].getText(invoiceSearchObj.columns[9]),
        //         department: results[i].getValue(invoiceSearchObj.columns[10]),
        //         class: results[i].getValue(invoiceSearchObj.columns[11]),
        //     });
        // }

        //get all Revenue Recognition Reference Records and exclude from invoice array so that no invoice appear again
        var revRecogRefResults = revRecogRefSearch();

        // Make a Set of internalIDs from revRecogRefResults for fast lookup
        var revIds = new Set(revRecogRefResults.map(r => r.internalID));

        // Filter invoices and keep only those NOT in revIds
        invoices = invoices.filter(inv => !revIds.has(inv.internalID));

        return invoices;
    }

    function revRecogRefSearch() {
        var title = 'revRecogRefSearch[::]';
        var array = [];
        var obj;
        try {
            var customrecord1104SearchObj = search.create({
                type: "customrecord1104",
                filters:
                    [
                        ["isinactive", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_mes_revenue_reference", label: "Revenue Recognition Journal Reference" }),
                        search.createColumn({ name: "custrecord_mes_invoice_no", label: "Invoice Number" }),
                        search.createColumn({ name: "custrecord_mes_date_recognition", label: "Recognition Date" })
                    ]
            });
            customrecord1104SearchObj.run().each(function (result) {
                obj = {};
                obj.internalID = result.getValue({ name: 'custrecord_mes_invoice_no' });
                array.push(obj);
                return true;
            });

            /*
            customrecord1104SearchObj.id="customsearch1758859449523";
            customrecord1104SearchObj.title="Revenue Recognition Reference Search (copy)";
            var newSearchId = customrecord1104SearchObj.save();
            */
        } catch (e) {
            log.error(title + e.name, e.message);
        }
        return array || [];
    }

    function getAccountingPeriods() {
        /** FETCH POSTING PERIOD */

        let postingPeriods = [];

        var accountingperiodSearch = search.create({
            type: "accountingperiod",
            filters: [["isyear", "is", "F"], "AND", ["isquarter", "is", "F"], "AND", ["isadjust", "is", "F"]],
            columns: [
                "periodname",
                search.createColumn({
                    name: "startdate",
                    sort: search.Sort.ASC,
                }),
            ],
        });

        var accountingperiodSearchResults = accountingperiodSearch.run().getRange(0, 1000);

        for (var i = 0; i < accountingperiodSearchResults.length; i++) {
            postingPeriods.push({
                internalID: accountingperiodSearchResults[i].id,
                name: accountingperiodSearchResults[i].getValue("periodname"),
            });
        }

        return postingPeriods;
    }

    function isEmpty(value) {
        if (value == null || value == "null" || value == undefined || value == "undefined" || value == "" || value == "" || value.length <= 0) {
            return true;
        }
        return false;
    }

    return { onRequest };
});
