/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/record', 'N/search', '../lodash.js', 'N/task', 'N/file', './moment.js'], 
    function(serverWidget, record, search, _, task, file, moment) {

    const PAYMENT_METHODS = {
        CORPORATE_CHECK: { id: '10', value: 'corporate_check', text: 'Corporate check (BAYCCP)', code: 'CCPBAY', checkType: '02' },
        CASHIER_CHECK: { id: '11', value: 'cashier_check', text: 'Cashier check (BAYCHQ)', code: 'CHQBAY', checkType: '02' },
        BANK_TRANSFER: { id: '9', value: 'bank_transfer', text: 'Bank Transfer-BAY', code: 'MEDIABAY', checkType: '  '}
    };

    function onRequest(context) {
        const selectedFilters = {
            recordType: context.request.parameters.recordType || 'vendorpayment',
            paymentMethod: context.request.parameters.paymentMethod || null,
            vendor: context.request.parameters.vendor,
            bankId: context.request.parameters.bankId
        };
        if (context.request.method === 'GET') {
            const form = createForm(selectedFilters);
            context.response.writePage(form);
        } else {
            const requestData = JSON.parse(context.request.body);
            const batchData = requestData.batchData;
            const paymentsData = requestData.paymentsData;
            const transactionIds = requestData.transactionIds;

            const scheduledScriptTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: 'customscript_ps_electronic_payments_sch',
                deploymentId: 'customdeploy_ps_electronic_payments_dep',
                params: {
                    'custscript_batch_data': JSON.stringify(batchData),
                    'custscript_payments_data': JSON.stringify(paymentsData),
                    'custscript_transaction_ids': JSON.stringify(transactionIds)
                }
            });

            const taskId = scheduledScriptTask.submit();
            log.debug('Scheduled Script Task ID', taskId);

            const result = {
                success: true,
                taskId: taskId
            };
            context.response.write({ output: JSON.stringify(result) });
        }
    }

    function createForm(selectedFilters) {
        const form = serverWidget.createForm({
            title: 'Electronic Bank Payment'
        });

        form.clientScriptModulePath = './ps_electronic_payment_cs.js';

        const refreshButton = form.addButton({
            id: 'custpage_refresh',
            label: 'Refresh',
            functionName: 'refreshPage()'
        });

        const fieldGroup1 = form.addFieldGroup({
            id: 'custpage_field_group',
            label: 'Payment Transaction Search'
        });

        const selectBank = form.addField({
            id: 'custpage_bank',
            type: serverWidget.FieldType.SELECT,
            label: 'Select Bank',
            container: 'custpage_field_group'
        });
        selectBank.addSelectOption({
            value: '',
            text: ''
        });
        const banks = getCompanyBankDetails();
        selectBank.isMandatory = true;
        banks.forEach(function(bank) {
            selectBank.addSelectOption({
                value: bank.id,
                text: bank.name
            });
        });

        let accountNumber = '';
        let currency = '';
        if(selectedFilters.bankId) {
            selectBank.defaultValue = selectedFilters.bankId;
            const bankDetails = banks.find(bank => bank.id === selectedFilters.bankId);
            accountNumber = bankDetails.accountNumber;
            currency = bankDetails.currencyName;
        }

        const companyBankAccountField = form.addField({
            id: 'custpage_company_bank_account',
            type: serverWidget.FieldType.TEXT,
            label: 'Company Account',
            container: 'custpage_field_group'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED
        });
        companyBankAccountField.defaultValue = accountNumber;

        const currencyField = form.addField({
            id: 'custpage_currency',
            type: serverWidget.FieldType.TEXT,
            label: 'Currency',
            container: 'custpage_field_group'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED
        });
        currencyField.defaultValue = currency;

        const recordType = form.addField({
            id: 'custpage_record_type',
            type: serverWidget.FieldType.SELECT,
            label: 'Record Type',
            container: 'custpage_field_group'
        });
        recordType.isMandatory = true;
        recordType.addSelectOption({
            value: 'vendorpayment',
            text: 'Vendor Payment'
        });

        const paymentMethod = form.addField({
            id: 'custpage_payment_method',
            type: serverWidget.FieldType.SELECT,
            label: 'Payment Method',
            container: 'custpage_field_group'
        });
        paymentMethod.isMandatory = true;
        paymentMethod.addSelectOption({
            value: '',
            text: ''
        });

        Object.keys(PAYMENT_METHODS).forEach(function(key) {
            paymentMethod.addSelectOption({
                value: PAYMENT_METHODS[key].value,
                text: PAYMENT_METHODS[key].text
            });
        });

        if(selectedFilters.paymentMethod) {
            paymentMethod.defaultValue = selectedFilters.paymentMethod;
        }
        
        const vendor = form.addField({
            id: 'custpage_vendor',
            type: serverWidget.FieldType.SELECT,
            label: 'Vendor',
            source: 'vendor',
            container: 'custpage_field_group'
        });

        if(selectedFilters.vendor) {
            vendor.defaultValue = selectedFilters.vendor;
        }

        const fieldGroup2 = form.addFieldGroup({
            id: 'custpage_field_group2',
            label: 'Payment File Information'
        });

        const paymentDate = form.addField({
            id: 'custpage_payment_date',
            type: serverWidget.FieldType.DATE,
            label: 'Payment Date',
            container: 'custpage_field_group2'
        });
        paymentDate.isMandatory = true;
        let today = new Date();
        let dd = String(today.getDate()).padStart(2, '0');
        let mm = String(today.getMonth() + 1).padStart(2, '0');
        let yyyy = today.getFullYear();
        today = dd + '/' + mm + '/' + yyyy;
        paymentDate.defaultValue = today;

        const postingPeriod = form.addField({
            id: 'custpage_posting_period',
            type: serverWidget.FieldType.SELECT,
            label: 'Posting Period',
            source: 'accountingperiod',
            container: 'custpage_field_group2'
        });

        const referenceNote = form.addField({
            id: 'custpage_reference_note',
            type: serverWidget.FieldType.TEXT,
            label: 'Reference Note',
            container: 'custpage_field_group2'
        });

        const totalPaymentsField = form.addField({
            id: 'custpage_total_payments',
            type: serverWidget.FieldType.CURRENCY,
            label: 'Total Payments',
            container: 'custpage_field_group2'
        });

        const totalAmountField = form.addField({
            id: 'custpage_total_amount',
            type: serverWidget.FieldType.CURRENCY,
            label: 'Total Payment Amount',
            container: 'custpage_field_group2'
        });

        addSublist(form, selectedFilters);

        form.addSubmitButton({
            label: 'Generate Payment File'
        });

        return form;
    }

    function addSublist(form, selectedFilters) {
        const payments = getPayments(selectedFilters);
        const sublist = form.addSublist({
            id: 'custpage_sublist',
            type: serverWidget.SublistType.LIST,
            label: `Payments (${payments.length})`,
            tab: 'custpage_field_group2'
        });
        form.getField('custpage_total_payments').defaultValue = payments.length;
        form.getField('custpage_total_amount').defaultValue = (payments.reduce((acc, payment) => acc + parseFloat(payment.amount), 0)).toFixed(2);
        
        sublist.addButton({
            id: 'custpage_mark_all',
            label: 'Mark All',
            functionName: 'markAll()'
        });
        sublist.addButton({
            id: 'custpage_unmark_all',
            label: 'Unmark All',
            functionName: 'unmarkAll()'
        });

        {
            sublist.addField({
                id: 'select_transaction',
                type: serverWidget.FieldType.CHECKBOX,
                label: 'Select'
            });
            sublist.addField({
                id: 'transaction_id',
                type: serverWidget.FieldType.TEXT,
                label: 'Transaction ID'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            sublist.addField({
                id: 'check_id',
                type: serverWidget.FieldType.TEXT,
                label: 'Check ID'
            });
            sublist.addField({
                id: 'transaction_number',
                type: serverWidget.FieldType.TEXT,
                label: 'Transaction Number'
            });
            sublist.addField({
                id: 'transaction_date',
                type: serverWidget.FieldType.DATE,
                label: 'Transaction Date'
            });
            sublist.addField({
                id: 'entity',
                type: serverWidget.FieldType.TEXT,
                label: 'Entity'
            });
            sublist.addField({
                id: 'amount',
                type: serverWidget.FieldType.CURRENCY,
                label: 'Amount'
            });
            
            sublist.addField({
                id: 'charges_borne_by',
                type: serverWidget.FieldType.TEXT,
                label: 'Charges Borne By'
            });
            sublist.addField({
                id: 'check_point',
                type: serverWidget.FieldType.TEXT,
                label: 'Check Point'
            });
            sublist.addField({
                id: 'vendor_id',
                type: serverWidget.FieldType.TEXT,
                label: 'Vendor Id'
            });
            sublist.addField({
                id: 'third_party_name',
                type: serverWidget.FieldType.TEXT,
                label: 'Third Party Name'
            });
            sublist.addField({
                id: 'third_party_address',
                type: serverWidget.FieldType.TEXT,
                label: 'Third Party Address'
            });
            sublist.addField({
                id: 'fax',
                type: serverWidget.FieldType.TEXT,
                label: 'Fax'
            });
            sublist.addField({
                id: 'email',
                type: serverWidget.FieldType.TEXT,
                label: 'Email'
            });
            sublist.addField({
                id: 'phone',
                type: serverWidget.FieldType.TEXT,
                label: 'Phone'
            });
            sublist.addField({
                id: 'ps_tht_entity_branch',
                type: serverWidget.FieldType.TEXT,
                label: 'PS|THT|Entity Branch'
            });
            sublist.addField({
                id: 'bank_branch',
                type: serverWidget.FieldType.TEXT,
                label: 'Bank Branch'
            });
            sublist.addField({
                id: 'bank_account',
                type: serverWidget.FieldType.TEXT,
                label: 'Bank Account'
            });
            sublist.addField({
                id: 'swift_code',
                type: serverWidget.FieldType.TEXT,
                label: 'Bank SWIFT Code'
            });
            sublist.addField({
                id: 'tax_id',
                type: serverWidget.FieldType.TEXT,
                label: 'PS|THT|Tax Id'
            });
            sublist.addField({
                id: 'wht_subsidiary_branch',
                type: serverWidget.FieldType.TEXT,
                label: 'WHT Subsidiary Branch'
            });
        }

        log.debug('Payments', JSON.stringify(payments));
        for(var i = 0; i < payments.length; i++) {
            sublist.setSublistValue({
                id: 'select_transaction',
                line: i,
                value: 'F'
            });
            sublist.setSublistValue({
                id: 'transaction_id',
                line: i,
                value: payments[i].transactionId
            });
            sublist.setSublistValue({
                id: 'check_id',
                line: i,
                value: payments[i].checkId
            });
            sublist.setSublistValue({
                id: 'transaction_number',
                line: i,
                value: payments[i].transactionNumber
            });
            sublist.setSublistValue({
                id: 'transaction_date',
                line: i,
                value: payments[i].transactionDate
            });
            sublist.setSublistValue({
                id: 'entity',
                line: i,
                value: payments[i].entity
            });
            sublist.setSublistValue({
                id: 'amount',
                line: i,
                value: payments[i].amount
            });
            if(payments[i].chargesBorneBy){
                sublist.setSublistValue({
                    id: 'charges_borne_by',
                    line: i,
                    value: payments[i].chargesBorneBy
                });
            }
            if(payments[i].checkPoint){
                sublist.setSublistValue({
                    id: 'check_point',
                    line: i,
                    value: payments[i].checkPoint
                });
            }
            if(payments[i].vendorId){
                sublist.setSublistValue({
                    id: 'vendor_id',
                    line: i,
                    value: payments[i].vendorId
                });
            }
            if(payments[i].thirdPartyName){
                sublist.setSublistValue({
                    id: 'third_party_name',
                    line: i,
                    value: payments[i].thirdPartyName
                });
            }
            if(payments[i].thirdPartyAddress){
                sublist.setSublistValue({
                    id: 'third_party_address',
                    line: i,
                    value: payments[i].thirdPartyAddress
                });
            }
            if(payments[i].fax){
                sublist.setSublistValue({
                    id: 'fax',
                    line: i,
                    value: payments[i].fax
                });
            }
            if(payments[i].email){
                sublist.setSublistValue({
                    id: 'email',
                    line: i,
                    value: payments[i].email
                });
            }
            if(payments[i].phone){
                sublist.setSublistValue({
                    id: 'phone',
                    line: i,
                    value: payments[i].phone
                });
            }
            if(payments[i].psTHTEntityBranch){
                sublist.setSublistValue({
                    id: 'ps_tht_entity_branch',
                    line: i,
                    value: payments[i].psTHTEntityBranch
                });
            }
            if(payments[i].bankBranch){
                sublist.setSublistValue({
                    id: 'bank_branch',
                    line: i,
                    value: payments[i].bankBranch
                });
            }
            if(payments[i].bankAccount){
                sublist.setSublistValue({
                    id: 'bank_account',
                    line: i,
                    value: payments[i].bankAccount
                });
            }
            if(payments[i].swiftCode){
                sublist.setSublistValue({
                    id: 'swift_code',
                    line: i,
                    value: payments[i].swiftCode
                });
            }
            if(payments[i].taxId){
                sublist.setSublistValue({
                    id: 'tax_id',
                    line: i,
                    value: payments[i].taxId
                });
            }
            if(payments[i].WHTSubsidiaryBranch){
                sublist.setSublistValue({
                    id: 'wht_subsidiary_branch',
                    line: i,
                    value: payments[i].WHTSubsidiaryBranch
                });
            }
        }
    }

    function getCompanyBankDetails() {
        const banks = [];
        const customrecord_ebp_company_bank_detailsSearchObj = search.create({
            type: "customrecord_ebp_company_bank_details",
            filters: [],
            columns: [
               search.createColumn({name: "name", label: "Name"}),
               search.createColumn({name: "custrecord_cbd_legal_name", label: "Legal Name"}),
               search.createColumn({name: "custrecord_cbd_currency", label: "Currency"}),
               search.createColumn({name: "custrecord_ebp_file_cab_loc", label: "File Cabinet Location"}),
               search.createColumn({name: "custrecord_cbd_file_type", label: "File Type"}),
               search.createColumn({name: "custrecord_cbd_account_number", label: "Account Number"}),
               search.createColumn({name: "custrecord_cbd_gl_account", label: "GL Bank Account"})
            ]
         });
         const searchResultCount = customrecord_ebp_company_bank_detailsSearchObj.runPaged().count;
         log.debug("customrecord_ebp_company_bank_detailsSearchObj result count", searchResultCount);
         customrecord_ebp_company_bank_detailsSearchObj.run().each(function(result){
            banks.push({
                id: result.id,
                name: result.getValue({name: "name"}),
                legalName: result.getValue({name: "custrecord_cbd_legal_name"}),
                currency: result.getValue({name: "custrecord_cbd_currency"}),
                currencyName: result.getText({name: "custrecord_cbd_currency"}),
                fileCabinetLocation: result.getValue({name: "custrecord_ebp_file_cab_loc"}),
                fileType: result.getValue({name: "custrecord_cbd_file_type"}),
                accountNumber: result.getValue({name: "custrecord_cbd_account_number"}),
                glBankAccount: result.getValue({name: "custrecord_cbd_gl_account"})
            });
            return true;
         });
         
        return banks;
    }

    function getPayments(selectedFilters) {
        const payments = [];
        const filters = [
            ["type","anyof","VendPymt"],
            "AND",
            ["status","anyof","VendPymt:F"],
            "AND",
            ["custbody_ps_ebp_file_generated","is","F"],
            "AND",
            ["mainline","is","F"]
        ];

        if (selectedFilters.vendor) {
            filters.push("AND");
            filters.push(["entity","anyof",selectedFilters.vendor]);
        }
        if (selectedFilters.paymentMethod) {
            filters.push("AND");
            const paymentMethodId = Object.values(PAYMENT_METHODS).find(method => method.value === selectedFilters.paymentMethod).id;
            filters.push(["custbody_ps_document_type", "anyof", paymentMethodId]);
        }

        const vendorpaymentSearchObj = search.create({
            type: "vendorpayment",
            filters: filters,
            columns: [
            search.createColumn({name: "trandate", label: "Date"}),
            search.createColumn({name: "transactionnumber", label: "Transaction Number"}),
            search.createColumn({name: "tranid", label: "Check#"}),
            search.createColumn({name: "entity", label: "Name"}),
            search.createColumn({name: "account", label: "Account"}),
            search.createColumn({name: "amount", label: "Amount"}),
            search.createColumn({
               name: "custentity19",
               join: "vendor",
               label: "Bank Charge"
            }),
            search.createColumn({
               name: "custentity20",
               join: "vendor",
               label: "Receiving check point"
            }),
            search.createColumn({
               name: "entityid",
               join: "vendor",
               label: "Vendor Id"
            }),
            search.createColumn({
               name: "altname",
               join: "vendor",
               label: "Third Party Name"
            }),
            search.createColumn({name: "billaddress", label: "Third Party Address"}),
            search.createColumn({
               name: "fax",
               join: "vendor",
               label: "Fax"
            }),
            search.createColumn({
               name: "email",
               join: "vendor",
               label: "Email"
            }),
            search.createColumn({
               name: "phone",
               join: "vendor",
               label: "Phone"
            }),
            search.createColumn({
               name: "custentity_ps_wht_entity_branch",
               join: "vendor",
               label: "PS|THT|Entity Branch"
            }),
            search.createColumn({
               name: "custentitynismt_bank_branch",
               join: "vendor",
               label: "Bank Branch"
            }),
            search.createColumn({
               name: "custentitynismt_bank_account",
               join: "vendor",
               label: "Bank Account"
            }),
            search.createColumn({
               name: "custentitynismt_bank_swift",
               join: "vendor",
               label: "Bank SWIFT Code"
            }),
            search.createColumn({
               name: "custentity_ps_wht_tax_id",
               join: "vendor",
               label: "PS|THT|Tax Id"
            }),
            search.createColumn({
                name: 'cseg_subs_branch',
                label: 'WHT Subsidiary Branch'
             }),
            search.createColumn({
                name: "internalid",
                sort: search.Sort.DESC,
                label: "Internal ID"
            })
             ]
         });
        const searchResultCount = vendorpaymentSearchObj.runPaged().count;
        log.debug("vendorpaymentSearchObj result count", searchResultCount);
        const searchResults = getAllSavedSearchResults(vendorpaymentSearchObj);
        log.debug('Search Results', JSON.stringify(searchResults));
       
        searchResults.forEach(function(result) {
            const payment = {
                transactionId: result.id,
                checkId: result.getValue({name: "tranid"}),
                transactionDate: result.getValue({name: "trandate"}),
                transactionNumber: result.getValue({name: "transactionnumber"}),
                entity: result.getText({name: "entity"}),
                amount: result.getValue({name: "amount"}),
                chargesBorneBy: result.getValue({name: "custentity19", join: "vendor"}),
                checkPoint: result.getValue({name: "custentity20", join: "vendor"}),
                vendorId: result.getValue({name: "entityid", join: "vendor"}),
                thirdPartyName: result.getValue({name: "altname", join: "vendor"}),
                thirdPartyAddress: result.getValue({name: "billaddress"}),
                fax: result.getValue({name: "fax", join: "vendor"}),
                email: result.getValue({name: "email", join: "vendor"}),
                phone: result.getValue({name: "phone", join: "vendor"}),
                psTHTEntityBranch: result.getValue({name: "custentity_ps_wht_entity_branch", join: "vendor"}),
                bankBranch: result.getValue({name: "custentitynismt_bank_branch", join: "vendor"}),
                bankAccount: result.getValue({name: "custentitynismt_bank_account", join: "vendor"}),
                swiftCode: result.getValue({name: "custentitynismt_bank_swift", join: "vendor"}),
                taxId: result.getValue({name: "custentity_ps_wht_tax_id", join: "vendor"}),
                WHTSubsidiaryBranch: result.getValue({name: 'cseg_subs_branch'})
            };
            payments.push(payment);
        });

         log.debug('Payments', JSON.stringify(payments));

        return payments;
    }

    function getAllSavedSearchResults(searchObj){
        try{
            let set = 0;
            let mappingResult = [];
            const rs = searchObj.run();
            do{
                set = rs.getRange({
                    start: mappingResult.length,
                    end: mappingResult.length + 1000
                });
                mappingResult = mappingResult.concat(set);
            } while (set.length === 1000);
            return mappingResult;
        } catch (e) {
            log.error('Error getAllSavedSearchResults', e);
            throw e;
        }
    }

    return {
        onRequest: onRequest
    };
});