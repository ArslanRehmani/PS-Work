/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/ui/dialog', 'N/url', 'N/search', 'N/https'], function(currentRecord, dialog, url, search, https) {

    const scriptId = 'customscript_ps_electronic_payments_sl';
    const deploymentId = 'customdeploy_ps_electronic_payments_dep';
    const baseURL = 'https://9632332.app.netsuite.com';
   
    function refreshPage(){
        window.onbeforeunload = null;
        location.reload();
    }

    function resolveScriptURL(params={}) {
        return url.resolveScript({
            scriptId: scriptId,
            deploymentId: deploymentId,
            params: params
        })
    }

    function returnToSuitelet(params={}) {
        const suiteletURL = resolveScriptURL(params);
        window.location.replace(suiteletURL);
    }

    function markAll(){
        const currentRec = currentRecord.get();
        const lineCount = currentRec.getLineCount({ sublistId: 'custpage_sublist' });
        for (let i = 0; i < lineCount; i++) {
            currentRec.selectLine({ sublistId: 'custpage_sublist', line: i });
            currentRec.setCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'select_transaction', value: true });
            currentRec.commitLine({ sublistId: 'custpage_sublist' });
        }
    }

    function unmarkAll(){
        const currentRec = currentRecord.get();
        const lineCount = currentRec.getLineCount({ sublistId: 'custpage_sublist' });
        for (let i = 0; i < lineCount; i++) {
            currentRec.selectLine({ sublistId: 'custpage_sublist', line: i });
            currentRec.setCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'select_transaction', value: false });
            currentRec.commitLine({ sublistId: 'custpage_sublist' });
        }
    }

    function saveRecord(context) {
        window.onbeforeunload = null;

        const currentRec = currentRecord.get();
        let isLineSelected = false;
        const bank = currentRec.getValue({ fieldId: 'custpage_bank' });
        if(!bank) {
            alert('Please select a bank account.');
            return false;
        }
        const lineCount = currentRec.getLineCount({ sublistId: 'custpage_sublist' });
        for (let i = 0; i < lineCount; i++) {
            if (currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'select_transaction', line: i })) {
                isLineSelected = true;
                break;
            }
        }
        if (!isLineSelected) {
            alert('Please select at least one transaction to generate the payment file.');
            return false;
        } else {
            if(confirm('Are you sure you want to generate the payment file?')) {
                const transactionIds = [];
                const paymentsData = [];
                let totalTransactions = 0;
                let totalAmount = 0;
                const batchData = {};
                batchData.bankId = currentRec.getValue({ fieldId: 'custpage_bank' });
                batchData.paymentMethod = currentRec.getValue({ fieldId: 'custpage_payment_method' }) || 'corporate_check';
                batchData.paymentDate = currentRec.getValue({ fieldId: 'custpage_payment_date' });
                batchData.companyBankAccount = currentRec.getValue({ fieldId: 'custpage_company_bank_account' });
                batchData.currency = currentRec.getValue({ fieldId: 'custpage_currency' });
                batchData.referenceNote = currentRec.getValue({ fieldId: 'custpage_reference_note' });

                for (let i = 0; i < lineCount; i++) {
                    const isSelected = currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'select_transaction', line: i });
                    if (isSelected) {
                        totalTransactions++;
                        totalAmount += currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'amount', line: i });
                        transactionIds.push(currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'transaction_id', line: i }));
                        paymentsData.push({
                            transactionId: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'transaction_id', line: i }),
                            checkId: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'check_id', line: i }),
                            transactionNumber: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'transaction_number', line: i }),
                            transactionDate: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'transaction_date', line: i }),
                            entity: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'entity', line: i }),
                            amount: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'amount', line: i }),
                            chargesBorneBy: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'charges_borne_by', line: i }),
                            checkPoint: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'check_point', line: i }),
                            vendorId: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'vendor_id', line: i }),
                            thirdPartyName: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'third_party_name', line: i }),
                            thirdPartyAddress: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'third_party_address', line: i }),
                            fax: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'fax', line: i }),
                            email: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'email', line: i }),
                            phone: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'phone', line: i }),
                            psTHTEntityBranch: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'ps_tht_entity_branch', line: i }),
                            bankBranch: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'bank_branch', line: i }),
                            bankAccount: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'bank_account', line: i }),
                            swiftCode: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'swift_code', line: i }),
                            taxId: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'tax_id', line: i }),
                            WHTSubsidiaryBranch: currentRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'wht_subsidiary_branch', line: i }),
                        });
                    }
                }

                batchData.totalTransactions = totalTransactions;
                batchData.totalAmount = totalAmount;

                const scriptURL = resolveScriptURL();
                const response = https.post({
                    url: `${baseURL}${scriptURL}`,
                    body: JSON.stringify({ transactionIds, paymentsData, batchData }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if(response.code === 200) {
                    const result = JSON.parse(response.body);
                    if(result.success) {
                        alert('Payment file generation has been scheduled successfully.');
                        return true;
                    } else {
                        alert('An error occurred while scheduling the payment file generation.');
                        return false;
                    }
                } else {
                    alert('An error occurred while scheduling the payment file generation.');
                    return false;
                }
            } else {
                return false;
            }
        }
    }

    function fieldChanged(context) {
        window.onbeforeunload = null;
        const currentRec = currentRecord.get();
        const sublistId = context.sublistId;
        const fieldId = context.fieldId;
        
        if(fieldId === 'custpage_vendor' || fieldId === 'custpage_record_type' || fieldId === 'custpage_payment_method' || fieldId === 'custpage_bank') {
            const vendor = currentRec.getValue({ fieldId: 'custpage_vendor' });
            const recordType = currentRec.getValue({ fieldId: 'custpage_record_type' });
            const paymentMethod = currentRec.getValue({ fieldId: 'custpage_payment_method' });
            const bankId = currentRec.getValue({ fieldId: 'custpage_bank' });
            returnToSuitelet({ vendor, recordType, paymentMethod, bankId});
        }
    }

    return {
        saveRecord: saveRecord,
        fieldChanged: fieldChanged,
        refreshPage: refreshPage,
        markAll: markAll,
        unmarkAll: unmarkAll,
    };
});